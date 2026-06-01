const ApiError = require("../../common/ApiError");
const { isAdmin } = require("../../common/roles");
const templatesRepository = require("./templates.repository");

const OWNER_ERROR_MESSAGE = "Only the template owner can modify this template";

const rethrowTemplateOwnershipError = (error) => {
  if (error.message === templatesRepository.TEMPLATE_OWNER_FORBIDDEN) {
    throw new ApiError(403, OWNER_ERROR_MESSAGE);
  }
  throw error;
};

const listTemplates = async (actor, query) => {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;

  const result = isAdmin(actor)
    ? await templatesRepository.listAllTemplates({
        page,
        pageSize,
        isActive: query.isActive,
        userId: query.userId,
      })
    : await templatesRepository.listTemplates(actor.id, {
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

const listSharedTemplates = async (query) => {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;

  const result = await templatesRepository.listAdminTemplates({
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

const listAllTemplates = async (query) => {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;

  const result = await templatesRepository.listAllTemplates({
    page,
    pageSize,
    isActive: query.isActive,
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

const getTemplateById = async (actor, templateId) => {
  const template = isAdmin(actor)
    ? await templatesRepository.findTemplateByIdForAdmin(templateId)
    : (await templatesRepository.findTemplateById(actor.id, templateId)) ||
      (await templatesRepository.findAdminTemplateById(templateId));
  if (!template) {
    throw new ApiError(404, "Template not found");
  }
  return template;
};

const getTemplateByIdForAdmin = async (templateId) => {
  const template = await templatesRepository.findTemplateByIdForAdmin(
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

const updateTemplate = async (actor, templateId, payload) => {
  let updated;
  try {
    updated = await templatesRepository.updateTemplate(
      actor,
      templateId,
      payload,
    );
  } catch (error) {
    rethrowTemplateOwnershipError(error);
  }
  if (!updated) {
    throw new ApiError(404, "Template not found");
  }
  return updated;
};

const deleteTemplate = async (actor, templateId) => {
  let removed;
  try {
    removed = await templatesRepository.deleteTemplate(actor, templateId);
  } catch (error) {
    rethrowTemplateOwnershipError(error);
  }
  if (!removed) {
    throw new ApiError(404, "Template not found");
  }
  return { deleted: true };
};

const deleteAnyTemplate = async (actor, templateId) => {
  let removed;
  try {
    removed = await templatesRepository.deleteAnyTemplate(actor, templateId);
  } catch (error) {
    rethrowTemplateOwnershipError(error);
  }
  if (!removed) {
    throw new ApiError(404, "Template not found");
  }
  return { deleted: true };
};

const getTemplateDesigner = async (actor, templateId) => {
  let draft;
  try {
    draft = await templatesRepository.getTemplateDesigner(actor, templateId);
  } catch (error) {
    rethrowTemplateOwnershipError(error);
  }
  if (!draft) {
    throw new ApiError(404, "Template not found");
  }
  return draft;
};

const saveTemplateDesigner = async (actor, templateId, payload) => {
  let saved;
  try {
    saved = await templatesRepository.saveTemplateDesigner(
      actor,
      templateId,
      payload,
    );
  } catch (error) {
    rethrowTemplateOwnershipError(error);
  }
  if (!saved) {
    throw new ApiError(404, "Template not found");
  }
  return saved;
};

const publishTemplateDesigner = async (actor, templateId, payload) => {
  try {
    const published = await templatesRepository.publishTemplateDesigner(
      actor,
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
    rethrowTemplateOwnershipError(error);
  }
};

const listTemplateDesignerVersions = async (actor, templateId, query) => {
  const page = query.page || 1;
  const pageSize = query.pageSize || 20;

  let result;
  try {
    result = await templatesRepository.listTemplateDesignerVersions(
      actor,
      templateId,
      { page, pageSize },
    );
  } catch (error) {
    rethrowTemplateOwnershipError(error);
  }

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

const getTemplateDesignerVersion = async (actor, templateId, versionId) => {
  let version;
  try {
    version = await templatesRepository.getTemplateDesignerVersion(
      actor,
      templateId,
      versionId,
    );
  } catch (error) {
    rethrowTemplateOwnershipError(error);
  }
  if (!version) {
    throw new ApiError(404, "Template version not found");
  }
  return version;
};

const restoreTemplateDesignerVersion = async (
  actor,
  templateId,
  versionId,
) => {
  let restored;
  try {
    restored = await templatesRepository.restoreTemplateDesignerVersion(
      actor,
      templateId,
      versionId,
    );
  } catch (error) {
    rethrowTemplateOwnershipError(error);
  }
  if (!restored) {
    throw new ApiError(404, "Template version not found");
  }
  return restored;
};

module.exports = {
  listTemplates,
  listSharedTemplates,
  listAllTemplates,
  getTemplateById,
  getTemplateByIdForAdmin,
  createTemplate,
  updateTemplate,
  getTemplateDesigner,
  saveTemplateDesigner,
  publishTemplateDesigner,
  listTemplateDesignerVersions,
  getTemplateDesignerVersion,
  restoreTemplateDesignerVersion,
  deleteTemplate,
  deleteAnyTemplate,
};
