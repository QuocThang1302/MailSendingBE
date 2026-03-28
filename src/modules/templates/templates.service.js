const ApiError = require("../../common/ApiError");
const templatesRepository = require("./templates.repository");

const listTemplates = async (userId, query) => {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;

  const result = await templatesRepository.listTemplates(userId, {
    page,
    pageSize,
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

const getTemplateById = async (userId, templateId) => {
  const template = await templatesRepository.findTemplateById(
    userId,
    templateId,
  );
  if (!template) {
    throw new ApiError(404, "Template not found");
  }
  return template;
};

const createTemplate = async (userId, payload) => {
  return templatesRepository.createTemplate(userId, payload);
};

const updateTemplate = async (userId, templateId, payload) => {
  const updated = await templatesRepository.updateTemplate(
    userId,
    templateId,
    payload,
  );
  if (!updated) {
    throw new ApiError(404, "Template not found");
  }
  return updated;
};

const deleteTemplate = async (userId, templateId) => {
  const removed = await templatesRepository.deleteTemplate(userId, templateId);
  if (!removed) {
    throw new ApiError(404, "Template not found");
  }
  return { deleted: true };
};

module.exports = {
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
