const env = require("../../config/env");
const campaignsRepository = require("./campaigns.repository");

const SCHEDULER_LOCK_KEY = "campaign-scheduler-scan";
const DISPATCH_LOCK_KEY = "campaign-dispatch-worker";

const createWorkerId = () => {
  return `${process.pid}-${Math.random().toString(36).slice(2, 10)}`;
};

const runSchedulerCycle = async (workerId) => {
  const lockAcquired = await campaignsRepository.acquireWorkerLock(
    SCHEDULER_LOCK_KEY,
    workerId,
    env.schedulerLockTtlSeconds,
  );

  if (!lockAcquired) {
    return { skipped: true, reason: "scheduler lock busy" };
  }

  try {
    const dueCampaigns = await campaignsRepository.listDueScheduledCampaigns(
      env.schedulerBatchSize,
    );

    let enqueuedCount = 0;
    for (const campaign of dueCampaigns) {
      const result = await campaignsRepository.enqueueCampaignDispatch({
        userId: campaign.user_id,
        campaignId: campaign.id,
        source: "scheduled",
      });

      if (result.enqueued) {
        enqueuedCount += 1;
      }
    }

    return {
      skipped: false,
      due: dueCampaigns.length,
      enqueued: enqueuedCount,
    };
  } finally {
    await campaignsRepository.releaseWorkerLock(SCHEDULER_LOCK_KEY, workerId);
  }
};

const runDispatchCycle = async (workerId) => {
  const lockAcquired = await campaignsRepository.acquireWorkerLock(
    DISPATCH_LOCK_KEY,
    workerId,
    env.schedulerLockTtlSeconds,
  );

  if (!lockAcquired) {
    return { skipped: true, reason: "dispatch lock busy" };
  }

  try {
    const pendingItems = await campaignsRepository.listPendingDispatchQueue(
      env.schedulerBatchSize,
    );

    let processed = 0;
    let failed = 0;

    for (const item of pendingItems) {
      const claimed = await campaignsRepository.claimDispatchQueueItem(
        item.id,
        workerId,
      );

      if (!claimed) {
        continue;
      }

      try {
        await campaignsRepository.startCampaign(
          claimed.user_id,
          claimed.campaign_id,
        );
        await campaignsRepository.markDispatchQueueCompleted(claimed.id);
        processed += 1;
      } catch (error) {
        await campaignsRepository.markDispatchQueueFailed(
          claimed.id,
          error.message,
        );
        failed += 1;
      }
    }

    return {
      skipped: false,
      pending: pendingItems.length,
      processed,
      failed,
    };
  } finally {
    await campaignsRepository.releaseWorkerLock(DISPATCH_LOCK_KEY, workerId);
  }
};

const startCampaignScheduler = () => {
  if (!env.schedulerEnabled) {
    console.log("Campaign scheduler is disabled by SCHEDULER_ENABLED.");
    return {
      stop: () => {},
    };
  }

  const workerId = createWorkerId();

  const runTick = async () => {
    try {
      const scheduledResult = await runSchedulerCycle(workerId);
      const dispatchResult = await runDispatchCycle(workerId);

      if (!scheduledResult.skipped || !dispatchResult.skipped) {
        console.log(
          "[campaign-scheduler]",
          JSON.stringify({
            scheduledResult,
            dispatchResult,
          }),
        );
      }
    } catch (error) {
      console.error("[campaign-scheduler] tick failed:", error.message);
    }
  };

  const timer = setInterval(runTick, env.schedulerIntervalMs);
  runTick();

  console.log(
    `Campaign scheduler started (interval: ${env.schedulerIntervalMs}ms, batch: ${env.schedulerBatchSize})`,
  );

  return {
    stop: () => clearInterval(timer),
  };
};

module.exports = {
  startCampaignScheduler,
};
