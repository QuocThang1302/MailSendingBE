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

const getTemplateDesigner = async (userId, templateId) => {
  const draft = await templatesRepository.getTemplateDesigner(
    userId,
    templateId,
  );
  if (!draft) {
    throw new ApiError(404, "Template not found");
  }
  return draft;
};

const saveTemplateDesigner = async (userId, templateId, payload) => {
  const saved = await templatesRepository.saveTemplateDesigner(
    userId,
    templateId,
    payload,
  );
  if (!saved) {
    throw new ApiError(404, "Template not found");
  }
  return saved;
};

const publishTemplateDesigner = async (userId, templateId, payload) => {
  try {
    const published = await templatesRepository.publishTemplateDesigner(
      userId,
      templateId,
      payload,
    );
    if (!published) {
      throw new ApiError(404, "Template not found");
    }
    return published;
  } catch (error) {
    if (error.message === "DESIGNER_LAYOUT_REQUIRED") {
      throw new ApiError(400, "Designer layout is required to publish");
    }
    throw error;
  }
};

const listTemplateDesignerVersions = async (userId, templateId, query) => {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;

  const result = await templatesRepository.listTemplateDesignerVersions(
    userId,
    templateId,
    { page, pageSize },
  );

  if (!result) {
    throw new ApiError(404, "Template not found");
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

const getTemplateDesignerVersion = async (userId, templateId, versionId) => {
  const version = await templatesRepository.getTemplateDesignerVersion(
    userId,
    templateId,
    versionId,
  );
  if (!version) {
    throw new ApiError(404, "Template version not found");
  }
  return version;
};

const restoreTemplateDesignerVersion = async (
  userId,
  templateId,
  versionId,
) => {
  const restored = await templatesRepository.restoreTemplateDesignerVersion(
    userId,
    templateId,
    versionId,
  );
  if (!restored) {
    throw new ApiError(404, "Template version not found");
  }
  return restored;
};

module.exports = {
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  getTemplateDesigner,
  saveTemplateDesigner,
  publishTemplateDesigner,
  listTemplateDesignerVersions,
  getTemplateDesignerVersion,
  restoreTemplateDesignerVersion,
  deleteTemplate,
};
