const ApiError = require("../../common/ApiError");
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

module.exports = {
  listCampaigns,
  getCampaignById,
  listCampaignRecipients,
  createCampaign,
  updateCampaign,
  importRecipients,
  startCampaign,
  pauseCampaign,
};
