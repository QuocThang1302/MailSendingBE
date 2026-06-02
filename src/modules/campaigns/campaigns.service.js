const ApiError = require("../../common/ApiError");
const { isAdmin } = require("../../common/roles");
const XLSX = require("xlsx");
const campaignsRepository = require("./campaigns.repository");

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getColumnValue = (row, keys) => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }
  return undefined;
};

const parseRecipientsFromFile = (file) => {
  if (!file?.buffer) {
    throw new ApiError(
      400,
      "Missing upload file. Use multipart/form-data with field 'file'.",
    );
  }

  const workbook = XLSX.read(file.buffer, {
    type: "buffer",
    raw: false,
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false,
  });

  return rows.map((row) =>
    normalizeEmail(
      getColumnValue(row, [
        "email",
        "Email",
        "EMAIL",
        "recipient",
        "Recipient",
        "recipientEmail",
        "RecipientEmail",
      ]),
    ),
  );
};

const mapCampaignError = (error) => {
  if (error.message === "CAMPAIGN_NOT_FOUND") {
    throw new ApiError(404, "Campaign not found");
  }
  if (error.message === "CAMPAIGN_LOCKED") {
    throw new ApiError(
      409,
      "Campaign is already sending or sent and cannot be edited",
    );
  }
  if (error.message === "RECIPIENT_NOT_FOUND") {
    throw new ApiError(404, "Campaign recipient not found");
  }
  if (error.message === "RECIPIENT_EMAIL_EXISTS") {
    throw new ApiError(409, "This email is already in the campaign audience");
  }
  if (error.message === "RECIPIENT_LOCKED") {
    throw new ApiError(
      409,
      "This recipient has already been sent and cannot be edited",
    );
  }
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
};

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

const getCampaignRecipientById = async (userId, campaignId, recipientId) => {
  const recipient = await campaignsRepository.findCampaignRecipientById(
    userId,
    campaignId,
    recipientId,
  );
  if (!recipient) {
    throw new ApiError(404, "Sent email not found");
  }
  return recipient;
};

const createCampaign = async (userId, payload) => {
  try {
    return await campaignsRepository.createCampaign(userId, payload);
  } catch (error) {
    mapCampaignError(error);
  }
};

const updateCampaign = async (userId, campaignId, payload) => {
  try {
    return await campaignsRepository.updateCampaign(userId, campaignId, payload);
  } catch (error) {
    mapCampaignError(error);
  }
};

const createCampaignRecipient = async (userId, campaignId, payload) => {
  try {
    return await campaignsRepository.createCampaignRecipient(
      userId,
      campaignId,
      payload,
    );
  } catch (error) {
    mapCampaignError(error);
  }
};

const updateCampaignRecipient = async (
  userId,
  campaignId,
  recipientId,
  payload,
) => {
  try {
    return await campaignsRepository.updateCampaignRecipient(
      userId,
      campaignId,
      recipientId,
      payload,
    );
  } catch (error) {
    mapCampaignError(error);
  }
};

const deleteCampaignRecipient = async (userId, campaignId, recipientId) => {
  try {
    await campaignsRepository.deleteCampaignRecipient(
      userId,
      campaignId,
      recipientId,
    );
    return { deleted: true };
  } catch (error) {
    mapCampaignError(error);
  }
};

const deleteCampaign = async (userId, campaignId) => {
  const removed = await campaignsRepository.deleteCampaign(userId, campaignId);
  if (!removed) {
    throw new ApiError(404, "Campaign not found or cannot be deleted");
  }
  return { deleted: true };
};

const importRecipients = async (_userId, { file }) => {
  const rows = parseRecipientsFromFile(file);
  const uniqueRecipients = [];
  const errors = [];
  const seen = new Set();

  rows.forEach((email, index) => {
    const rowNumber = index + 2;

    if (!email) {
      errors.push({ row: rowNumber, message: "Missing email" });
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      errors.push({ row: rowNumber, message: "Invalid email format" });
      return;
    }

    if (seen.has(email)) {
      return;
    }

    seen.add(email);
    uniqueRecipients.push(email);
  });

  return {
    totalRows: rows.length,
    importedCount: uniqueRecipients.length,
    invalidRows: errors.length,
    recipients: uniqueRecipients,
    errors,
  };
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

const resumeCampaign = async (userId, campaignId) => {
  const campaign = await campaignsRepository.resumeCampaign(userId, campaignId);
  if (!campaign) {
    throw new ApiError(404, "Campaign not found or cannot be resumed");
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

const resumeAnyCampaign = async (campaignId) => {
  const campaign = await campaignsRepository.resumeAnyCampaign(campaignId);
  if (!campaign) {
    throw new ApiError(404, "Campaign not found or cannot be resumed");
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
  getCampaignRecipientById,
  createCampaign,
  updateCampaign,
  createCampaignRecipient,
  updateCampaignRecipient,
  deleteCampaignRecipient,
  deleteCampaign,
  importRecipients,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  pauseAnyCampaign,
  resumeAnyCampaign,
  deleteCampaignByAdmin,
};
