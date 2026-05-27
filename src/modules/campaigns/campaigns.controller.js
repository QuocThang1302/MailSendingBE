const asyncHandler = require("../../common/asyncHandler");
const { sendOk } = require("../../common/http");
const campaignsService = require("./campaigns.service");

const listCampaigns = asyncHandler(async (req, res) => {
  const data = await campaignsService.listCampaigns(req.user.id, req.query);
  return sendOk(res, data, "Fetched campaigns");
});

const getCampaignById = asyncHandler(async (req, res) => {
  const data = await campaignsService.getCampaignById(
    req.user.id,
    req.params.id,
  );
  return sendOk(res, data, "Fetched campaign");
});

const listCampaignRecipients = asyncHandler(async (req, res) => {
  const data = await campaignsService.listCampaignRecipients(
    req.user.id,
    req.params.id,
    req.query,
  );
  return sendOk(res, data, "Fetched campaign recipients");
});

const getCampaignRecipientById = asyncHandler(async (req, res) => {
  const data = await campaignsService.getCampaignRecipientById(
    req.user.id,
    req.params.id,
    req.params.recipientId,
  );
  return sendOk(res, data, "Fetched sent email detail");
});

const createCampaign = asyncHandler(async (req, res) => {
  const data = await campaignsService.createCampaign(req.user.id, req.body);
  return sendOk(res, data, "Created campaign", 201);
});

const updateCampaign = asyncHandler(async (req, res) => {
  const data = await campaignsService.updateCampaign(
    req.user.id,
    req.params.id,
    req.body,
  );
  return sendOk(res, data, "Updated campaign");
});

const importRecipients = asyncHandler(async (req, res) => {
  const data = await campaignsService.importRecipients(req.user.id, {
    file: req.file,
  });
  return sendOk(res, data, "Imported campaign recipients");
});

const startCampaign = asyncHandler(async (req, res) => {
  const data = await campaignsService.startCampaign(req.user.id, req.params.id);
  return sendOk(res, data, "Campaign started");
});

const pauseCampaign = asyncHandler(async (req, res) => {
  const data = await campaignsService.pauseCampaign(req.user.id, req.params.id);
  return sendOk(res, data, "Campaign paused");
});

module.exports = {
  listCampaigns,
  getCampaignById,
  listCampaignRecipients,
  getCampaignRecipientById,
  createCampaign,
  updateCampaign,
  importRecipients,
  startCampaign,
  pauseCampaign,
};
