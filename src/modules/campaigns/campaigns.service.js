const ApiError = require("../../common/ApiError");
const { isAdmin } = require("../../common/roles");
const campaignsRepository = require("./campaigns.repository");

const listCampaigns = async (actor, query) => {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;

  const result = isAdmin(actor)
    ? await campaignsRepository.listAllCampaigns({
        page,
        pageSize,
        status: query.status,
        userId: query.userId,
      })
    : await campaignsRepository.listCampaigns(actor.id, {
        page,
        pageSize,
        status: query.status,
      });

  return {
    items: result.rows,
    pagination: {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
    },
  };
};

const listAllCampaigns = async (query) => {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;

  const result = await campaignsRepository.listAllCampaigns({
    page,
    pageSize,
    status: query.status,
    userId: query.userId,
  });

  return {
    items: result.rows,
    pagination: {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
    },
  };
};

const getCampaignById = async (actor, campaignId) => {
  const campaign = isAdmin(actor)
    ? await campaignsRepository.findCampaignByIdForAdmin(campaignId)
    : await campaignsRepository.findCampaignById(actor.id, campaignId);
  if (!campaign) {
    throw new ApiError(404, "Campaign not found");
  }
  return campaign;
};

const getCampaignByIdForAdmin = async (campaignId) => {
  const campaign = await campaignsRepository.findCampaignByIdForAdmin(
    campaignId,
  );
  if (!campaign) {
    throw new ApiError(404, "Campaign not found");
  }
  return campaign;
};

const listCampaignRecipients = async (actor, campaignId, query) => {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;

  const result = isAdmin(actor)
    ? await campaignsRepository.listCampaignRecipientsForAdmin(campaignId, {
        page,
        pageSize,
        status: query.status,
      })
    : await campaignsRepository.listCampaignRecipients(actor.id, campaignId, {
        page,
        pageSize,
        status: query.status,
      });

  if (!result) {
    throw new ApiError(404, "Campaign not found");
  }

  return {
    items: result.rows,
    pagination: {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
    },
  };
};

const listCampaignRecipientsForAdmin = async (campaignId, query) => {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;

  const result = await campaignsRepository.listCampaignRecipientsForAdmin(
    campaignId,
    {
      page,
      pageSize,
      status: query.status,
    },
  );

  if (!result) {
    throw new ApiError(404, "Campaign not found");
  }

  return {
    items: result.rows,
    pagination: {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
    },
  };
};

const createCampaign = async (userId, payload) => {
  try {
    return await campaignsRepository.createCampaign(userId, payload);
  } catch (error) {
    if (error.message === "TEMPLATE_NOT_FOUND") {
      throw new ApiError(404, "Template not found");
    }
    if (error.message === "EMAIL_ACCOUNT_NOT_FOUND") {
      throw new ApiError(404, "Email account not found");
    }
    if (error.message === "SEGMENT_NOT_FOUND") {
      throw new ApiError(404, "Segment not found");
    }
    throw error;
  }
};

const startCampaign = async (userId, campaignId) => {
  try {
    const campaign = await campaignsRepository.startCampaign(
      userId,
      campaignId,
    );
    if (!campaign) {
      throw new ApiError(404, "Campaign not found");
    }
    return campaign;
  } catch (error) {
    if (error.message === "INVALID_CAMPAIGN_STATUS") {
      throw new ApiError(409, "Campaign cannot be started from current status");
    }
    if (error.message === "TEMPLATE_NOT_FOUND") {
      throw new ApiError(404, "Template not found");
    }
    if (error.message === "EMAIL_ACCOUNT_NOT_FOUND") {
      throw new ApiError(404, "Email account not found");
    }
    if (error.message === "TEMPLATE_INACTIVE") {
      throw new ApiError(409, "Template is inactive");
    }
    if (error.message === "EMAIL_ACCOUNT_INACTIVE") {
      throw new ApiError(409, "Email account is inactive");
    }
    if (error.message === "SMTP_HOST_REQUIRED") {
      throw new ApiError(400, "SMTP host is required for this email account");
    }
    if (error.message === "SMTP_FROM_ADDRESS_REQUIRED") {
      throw new ApiError(
        400,
        "Email account must have a sender email address",
      );
    }
    throw error;
  }
};

const pauseCampaign = async (userId, campaignId) => {
  const campaign = await campaignsRepository.pauseCampaign(userId, campaignId);
  if (!campaign) {
    throw new ApiError(404, "Campaign not found or cannot be paused");
  }
  return campaign;
};

const pauseAnyCampaign = async (campaignId) => {
  const campaign = await campaignsRepository.pauseAnyCampaign(campaignId);
  if (!campaign) {
    throw new ApiError(404, "Campaign not found or cannot be paused");
  }
  return campaign;
};

const deleteCampaignByAdmin = async (campaignId) => {
  const removed = await campaignsRepository.deleteCampaignByAdmin(campaignId);
  if (!removed) {
    throw new ApiError(404, "Campaign not found");
  }
  return { deleted: true };
};

module.exports = {
  listCampaigns,
  listAllCampaigns,
  getCampaignById,
  getCampaignByIdForAdmin,
  listCampaignRecipients,
  listCampaignRecipientsForAdmin,
  createCampaign,
  startCampaign,
  pauseCampaign,
  pauseAnyCampaign,
  deleteCampaignByAdmin,
};
