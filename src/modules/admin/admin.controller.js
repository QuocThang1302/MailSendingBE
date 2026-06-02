const asyncHandler = require("../../common/asyncHandler");
const { sendOk } = require("../../common/http");
const adminService = require("./admin.service");

const getOverview = asyncHandler(async (_req, res) => {
  const data = await adminService.getOverview();
  return sendOk(res, data, "Fetched admin overview");
});

const listUsers = asyncHandler(async (req, res) => {
  const data = await adminService.listUsers(req.query);
  return sendOk(res, data, "Fetched users");
});

const getUserById = asyncHandler(async (req, res) => {
  const data = await adminService.getUserById(req.params.id);
  return sendOk(res, data, "Fetched user");
});

const updateUserRole = asyncHandler(async (req, res) => {
  const data = await adminService.updateUserRole(
    req.user,
    req.params.id,
    req.body,
  );
  return sendOk(res, data, "Updated user role");
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const data = await adminService.updateUserStatus(
    req.user,
    req.params.id,
    req.body,
  );
  return sendOk(res, data, "Updated user status");
});

const deleteTemplate = asyncHandler(async (req, res) => {
  const data = await adminService.deleteTemplate(req.user, req.params.id);
  return sendOk(res, data, "Deleted template");
});

const pauseCampaign = asyncHandler(async (req, res) => {
  const data = await adminService.pauseCampaign(req.params.id);
  return sendOk(res, data, "Paused campaign");
});

const resumeCampaign = asyncHandler(async (req, res) => {
  const data = await adminService.resumeCampaign(req.params.id);
  return sendOk(res, data, "Resumed campaign");
});

const deleteCampaign = asyncHandler(async (req, res) => {
  const data = await adminService.deleteCampaign(req.params.id);
  return sendOk(res, data, "Deleted campaign");
});

module.exports = {
  getOverview,
  listUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteTemplate,
  pauseCampaign,
  resumeCampaign,
  deleteCampaign,
};
