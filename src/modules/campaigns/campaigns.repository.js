const { supabase } = require("../../config/supabase");

const CAMPAIGN_COLUMNS =
  "id, campaign_name, template_id, email_account_id, segment_id, status, campaign_type, scheduled_time, started_at, completed_at, total_recipients, sent_count, open_count, click_count, bounce_count, unsubscribe_count, created_at, updated_at";
const RECIPIENT_COLUMNS =
  "id, contact_id, email, status, rendered_subject, sent_time, open_time, click_time, open_count, click_count, error_message";

const throwIfError = (error) => {
  if (error) {
    throw new Error(error.message);
  }
};

const unique = (values) => [...new Set(values.filter(Boolean))];

const decorateCampaignRows = async (rows) => {
  if (!rows || rows.length === 0) {
    return [];
  }

  const templateIds = unique(rows.map((row) => row.template_id));
  const accountIds = unique(rows.map((row) => row.email_account_id));
  const segmentIds = unique(rows.map((row) => row.segment_id));

  const [templatesResult, accountsResult, segmentsResult] = await Promise.all([
    templateIds.length > 0
      ? supabase
          .from("email_templates")
          .select("id, template_name")
          .in("id", templateIds)
      : Promise.resolve({ data: [], error: null }),
    accountIds.length > 0
      ? supabase
          .from("email_accounts")
          .select("id, email_address")
          .in("id", accountIds)
      : Promise.resolve({ data: [], error: null }),
    segmentIds.length > 0
      ? supabase
          .from("contact_segments")
          .select("id, segment_name")
          .in("id", segmentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  throwIfError(templatesResult.error);
  throwIfError(accountsResult.error);
  throwIfError(segmentsResult.error);

  const templateMap = new Map(
    (templatesResult.data || []).map((row) => [row.id, row.template_name]),
  );
  const accountMap = new Map(
    (accountsResult.data || []).map((row) => [row.id, row.email_address]),
  );
  const segmentMap = new Map(
    (segmentsResult.data || []).map((row) => [row.id, row.segment_name]),
  );

  return rows.map((row) => ({
    ...row,
    template_name: row.template_id
      ? templateMap.get(row.template_id) || null
      : null,
    sender_email: row.email_account_id
      ? accountMap.get(row.email_account_id) || null
      : null,
    segment_name: row.segment_id
      ? segmentMap.get(row.segment_id) || null
      : null,
  }));
};

const listCampaigns = async (userId, { page, pageSize, status }) => {
  const offset = (page - 1) * pageSize;

  let builder = supabase
    .from("campaigns")
    .select(CAMPAIGN_COLUMNS, { count: "exact" })
    .eq("user_id", userId);

  if (status) {
    builder = builder.eq("status", status);
  }

  const { data, count, error } = await builder
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  throwIfError(error);

  const decoratedRows = await decorateCampaignRows(data || []);

  return {
    total: count || 0,
    rows: decoratedRows,
  };
};

const findCampaignById = async (userId, campaignId) => {
  const { data: campaignRow, error: campaignError } = await supabase
    .from("campaigns")
    .select(CAMPAIGN_COLUMNS)
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  throwIfError(campaignError);

  if (!campaignRow) {
    return null;
  }

  const [decorated] = await decorateCampaignRows([campaignRow]);

  const { data: recipients, error: recipientsError } = await supabase
    .from("campaign_recipients")
    .select("status")
    .eq("campaign_id", campaignId);

  throwIfError(recipientsError);

  const recipientsByStatus = (recipients || []).reduce((acc, row) => {
    const key = row.status || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    ...decorated,
    recipientsByStatus,
  };
};

const listCampaignRecipients = async (
  userId,
  campaignId,
  { page, pageSize, status },
) => {
  const { data: ownership, error: ownershipError } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  throwIfError(ownershipError);

  if (!ownership) {
    return null;
  }

  const offset = (page - 1) * pageSize;

  let builder = supabase
    .from("campaign_recipients")
    .select(RECIPIENT_COLUMNS, { count: "exact" })
    .eq("campaign_id", campaignId);

  if (status) {
    builder = builder.eq("status", status);
  }

  const { data, count, error } = await builder
    .order("id", { ascending: false })
    .range(offset, offset + pageSize - 1);

  throwIfError(error);

  return {
    total: count || 0,
    rows: data || [],
  };
};

const createCampaign = async (userId, payload) => {
  const { data: templateCheck, error: templateError } = await supabase
    .from("email_templates")
    .select("id")
    .eq("id", payload.templateId)
    .eq("user_id", userId)
    .maybeSingle();
  throwIfError(templateError);
  if (!templateCheck) {
    throw new Error("TEMPLATE_NOT_FOUND");
  }

  const { data: emailAccountCheck, error: accountError } = await supabase
    .from("email_accounts")
    .select("id")
    .eq("id", payload.emailAccountId)
    .eq("user_id", userId)
    .maybeSingle();
  throwIfError(accountError);
  if (!emailAccountCheck) {
    throw new Error("EMAIL_ACCOUNT_NOT_FOUND");
  }

  const segmentId = payload.segmentId || null;
  if (segmentId) {
    const { data: segmentCheck, error: segmentError } = await supabase
      .from("contact_segments")
      .select("id")
      .eq("id", segmentId)
      .eq("user_id", userId)
      .maybeSingle();
    throwIfError(segmentError);
    if (!segmentCheck) {
      throw new Error("SEGMENT_NOT_FOUND");
    }
  }

  const status = payload.scheduledTime ? "scheduled" : "draft";

  const { data: campaignData, error: campaignInsertError } = await supabase
    .from("campaigns")
    .insert({
      user_id: userId,
      campaign_name: payload.campaignName,
      template_id: payload.templateId,
      email_account_id: payload.emailAccountId,
      segment_id: segmentId,
      status,
      campaign_type: payload.campaignType || "regular",
      scheduled_time: payload.scheduledTime || null,
      total_recipients: 0,
      sent_count: 0,
      open_count: 0,
      click_count: 0,
      bounce_count: 0,
      unsubscribe_count: 0,
    })
    .select(
      "id, campaign_name, template_id, email_account_id, segment_id, status, campaign_type, scheduled_time, created_at",
    )
    .maybeSingle();
  throwIfError(campaignInsertError);

  let recipients = [];
  if (segmentId) {
    const { data: segmentRows, error: segmentMapError } = await supabase
      .from("contact_segment_map")
      .select("contact_id")
      .eq("segment_id", segmentId);
    throwIfError(segmentMapError);

    const contactIds = unique((segmentRows || []).map((row) => row.contact_id));
    if (contactIds.length > 0) {
      const { data: contactRows, error: contactRowsError } = await supabase
        .from("email_contacts")
        .select("id, email")
        .eq("user_id", userId)
        .eq("email_status", "active")
        .in("id", contactIds);
      throwIfError(contactRowsError);
      recipients = contactRows || [];
    }
  } else if (
    Array.isArray(payload.contactIds) &&
    payload.contactIds.length > 0
  ) {
    const selectedIds = unique(payload.contactIds);
    const { data: selectedRows, error: selectedRowsError } = await supabase
      .from("email_contacts")
      .select("id, email")
      .eq("user_id", userId)
      .eq("email_status", "active")
      .in("id", selectedIds);
    throwIfError(selectedRowsError);
    recipients = selectedRows || [];
  } else {
    const { data: allRows, error: allRowsError } = await supabase
      .from("email_contacts")
      .select("id, email")
      .eq("user_id", userId)
      .eq("email_status", "active");
    throwIfError(allRowsError);
    recipients = allRows || [];
  }

  if (recipients.length > 0) {
    const recipientRows = recipients.map((row) => ({
      campaign_id: campaignData.id,
      contact_id: row.id,
      email: row.email,
      status: "pending",
    }));

    const { error: recipientsInsertError } = await supabase
      .from("campaign_recipients")
      .insert(recipientRows);
    throwIfError(recipientsInsertError);
  }

  const { error: campaignUpdateError } = await supabase
    .from("campaigns")
    .update({ total_recipients: recipients.length })
    .eq("id", campaignData.id);
  throwIfError(campaignUpdateError);

  return {
    ...campaignData,
    total_recipients: recipients.length,
  };
};

const startCampaign = async (userId, campaignId) => {
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, status, started_at, total_recipients, sent_count")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  throwIfError(campaignError);

  if (!campaign) {
    return null;
  }

  if (!["draft", "scheduled", "paused", "queued"].includes(campaign.status)) {
    throw new Error("INVALID_CAMPAIGN_STATUS");
  }

  const now = new Date().toISOString();

  const { error: markSendingError } = await supabase
    .from("campaigns")
    .update({
      status: "sending",
      started_at: campaign.started_at || now,
      updated_at: now,
    })
    .eq("id", campaignId);
  throwIfError(markSendingError);

  const { data: pendingRows, error: pendingRowsError } = await supabase
    .from("campaign_recipients")
    .select("id, contact_id, email")
    .eq("campaign_id", campaignId)
    .eq("status", "pending");
  throwIfError(pendingRowsError);

  const pendingRecipientIds = (pendingRows || []).map((row) => row.id);

  if (pendingRecipientIds.length > 0) {
    const { error: markRecipientsSentError } = await supabase
      .from("campaign_recipients")
      .update({
        status: "sent",
        sent_time: now,
      })
      .in("id", pendingRecipientIds);
    throwIfError(markRecipientsSentError);

    const logs = pendingRows.map((row) => ({
      user_id: userId,
      campaign_id: campaignId,
      contact_id: row.contact_id,
      email: row.email,
      status: "sent",
      message: "Campaign sent",
      sent_time: now,
    }));

    const { error: logError } = await supabase.from("email_logs").insert(logs);
    throwIfError(logError);
  }

  const sentNow = pendingRecipientIds.length;

  const { data: updatedCampaign, error: updatedCampaignError } = await supabase
    .from("campaigns")
    .update({
      status: "sent",
      completed_at: now,
      sent_count: (campaign.sent_count || 0) + sentNow,
      updated_at: now,
    })
    .eq("id", campaignId)
    .select(
      "id, campaign_name, status, campaign_type, total_recipients, sent_count, open_count, click_count, bounce_count, unsubscribe_count, started_at, completed_at, updated_at",
    )
    .maybeSingle();

  throwIfError(updatedCampaignError);

  return {
    ...updatedCampaign,
    sent_now: sentNow,
  };
};

const pauseCampaign = async (userId, campaignId) => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("campaigns")
    .update({
      status: "paused",
      updated_at: now,
    })
    .eq("id", campaignId)
    .eq("user_id", userId)
    .in("status", ["scheduled", "sending"])
    .select("id, campaign_name, status, updated_at")
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const acquireWorkerLock = async (lockKey, ownerId, ttlSeconds) => {
  const nowIso = new Date().toISOString();
  const expiresAtIso = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const { error: cleanupError } = await supabase
    .from("worker_locks")
    .delete()
    .eq("lock_key", lockKey)
    .lt("expires_at", nowIso);
  throwIfError(cleanupError);

  const { data, error } = await supabase
    .from("worker_locks")
    .insert({
      lock_key: lockKey,
      owner_id: ownerId,
      expires_at: expiresAtIso,
      updated_at: nowIso,
    })
    .select("lock_key")
    .maybeSingle();

  if (error) {
    if (error.message && error.message.includes("duplicate key value")) {
      return false;
    }
    throw new Error(error.message);
  }

  return !!data;
};

const releaseWorkerLock = async (lockKey, ownerId) => {
  const { error } = await supabase
    .from("worker_locks")
    .delete()
    .eq("lock_key", lockKey)
    .eq("owner_id", ownerId);
  throwIfError(error);
};

const listDueScheduledCampaigns = async (limit) => {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("campaigns")
    .select("id, user_id, scheduled_time")
    .eq("status", "scheduled")
    .lte("scheduled_time", nowIso)
    .order("scheduled_time", { ascending: true })
    .limit(limit);

  throwIfError(error);
  return data || [];
};

const enqueueCampaignDispatch = async ({ userId, campaignId, source }) => {
  const nowIso = new Date().toISOString();

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .update({
      status: "queued",
      updated_at: nowIso,
    })
    .eq("id", campaignId)
    .eq("user_id", userId)
    .eq("status", "scheduled")
    .lte("scheduled_time", nowIso)
    .select("id, user_id")
    .maybeSingle();

  throwIfError(campaignError);

  if (!campaign) {
    return { enqueued: false, reason: "NOT_DUE_OR_ALREADY_QUEUED" };
  }

  const { data: queueRow, error: queueError } = await supabase
    .from("campaign_dispatch_queue")
    .upsert(
      {
        campaign_id: campaignId,
        user_id: userId,
        source: source || "scheduled",
        status: "pending",
        available_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "campaign_id" },
    )
    .select("id, campaign_id, user_id, status, source, available_at")
    .maybeSingle();

  throwIfError(queueError);

  return {
    enqueued: true,
    queueItem: queueRow,
  };
};

const listPendingDispatchQueue = async (limit) => {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("campaign_dispatch_queue")
    .select("id, campaign_id, user_id, attempts")
    .eq("status", "pending")
    .lte("available_at", nowIso)
    .order("created_at", { ascending: true })
    .limit(limit);

  throwIfError(error);
  return data || [];
};

const claimDispatchQueueItem = async (queueId, workerId) => {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("campaign_dispatch_queue")
    .update({
      status: "processing",
      locked_by: workerId,
      locked_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", queueId)
    .eq("status", "pending")
    .select("id, campaign_id, user_id, attempts")
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const markDispatchQueueCompleted = async (queueId) => {
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from("campaign_dispatch_queue")
    .update({
      status: "completed",
      completed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", queueId);

  throwIfError(error);
};

const markDispatchQueueFailed = async (queueId, errorMessage) => {
  const nowIso = new Date().toISOString();

  const { data: current, error: currentError } = await supabase
    .from("campaign_dispatch_queue")
    .select("attempts")
    .eq("id", queueId)
    .maybeSingle();
  throwIfError(currentError);

  const attempts = (current?.attempts || 0) + 1;

  const { error } = await supabase
    .from("campaign_dispatch_queue")
    .update({
      status: "failed",
      attempts,
      last_error: errorMessage || "Unknown dispatch error",
      updated_at: nowIso,
    })
    .eq("id", queueId);

  throwIfError(error);
};

module.exports = {
  listCampaigns,
  findCampaignById,
  listCampaignRecipients,
  createCampaign,
  startCampaign,
  pauseCampaign,
  acquireWorkerLock,
  releaseWorkerLock,
  listDueScheduledCampaigns,
  enqueueCampaignDispatch,
  listPendingDispatchQueue,
  claimDispatchQueueItem,
  markDispatchQueueCompleted,
  markDispatchQueueFailed,
};
