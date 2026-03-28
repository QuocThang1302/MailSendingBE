const ApiError = require("../../common/ApiError");
const campaignsRepository = require("./campaigns.repository");

const listCampaigns = async (userId, query) => {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;

  const result = await campaignsRepository.listCampaigns(userId, {
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

const getCampaignById = async (userId, campaignId) => {
  const campaign = await campaignsRepository.findCampaignById(
    userId,
    campaignId,
  );
  if (!campaign) {
    throw new ApiError(404, "Campaign not found");
  }
  return campaign;
};

const listCampaignRecipients = async (userId, campaignId, query) => {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;

  const result = await campaignsRepository.listCampaignRecipients(
    userId,
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

module.exports = {
  listCampaigns,
  getCampaignById,
  listCampaignRecipients,
  createCampaign,
  startCampaign,
  pauseCampaign,
};
