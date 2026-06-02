const ApiError = require("../../common/ApiError");
const { ROLES, ROLE_VALUES } = require("../../common/roles");
const adminRepository = require("./admin.repository");
const campaignsService = require("../campaigns/campaigns.service");
const templatesService = require("../templates/templates.service");

const getOverview = () => adminRepository.getOverview();

const listUsers = async (query) => {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;

  const result = await adminRepository.listUsers({
    page,
    pageSize,
    role: query.role,
    isActive: query.isActive,
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

const getUserById = async (userId) => {
  const user = await adminRepository.findUserById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return user;
};

const updateUserRole = async (actor, userId, payload) => {
  const role = String(payload.role || "").trim().toLowerCase();
  if (!ROLE_VALUES.includes(role)) {
    throw new ApiError(400, "Invalid role");
  }

  if (Number(actor.id) === Number(userId)) {
    throw new ApiError(409, "Admin cannot change own role");
  }

  const user = await adminRepository.updateUserRole(userId, role);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return user;
};

const updateUserStatus = async (actor, userId, payload) => {
  if (Number(actor.id) === Number(userId) && payload.isActive === false) {
    throw new ApiError(409, "Admin cannot deactivate own account");
  }

  const user = await adminRepository.updateUserStatus(userId, payload.isActive);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return user;
};

const deleteTemplate = (actor, templateId) =>
  templatesService.deleteAnyTemplate(actor, templateId);

const pauseCampaign = (campaignId) =>
  campaignsService.pauseAnyCampaign(campaignId);

const resumeCampaign = (campaignId) =>
  campaignsService.resumeAnyCampaign(campaignId);

const deleteCampaign = (campaignId) =>
  campaignsService.deleteCampaignByAdmin(campaignId);

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
