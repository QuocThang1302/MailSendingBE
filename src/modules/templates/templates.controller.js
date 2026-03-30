const asyncHandler = require("../../common/asyncHandler");
const { sendOk } = require("../../common/http");
const templatesService = require("./templates.service");

const listTemplates = asyncHandler(async (req, res) => {
  const data = await templatesService.listTemplates(req.user.id, req.query);
  return sendOk(res, data, "Fetched templates");
});

const getTemplateById = asyncHandler(async (req, res) => {
  const data = await templatesService.getTemplateById(
    req.user.id,
    req.params.id,
  );
  return sendOk(res, data, "Fetched template");
});

const createTemplate = asyncHandler(async (req, res) => {
  const data = await templatesService.createTemplate(req.user.id, req.body);
  return sendOk(res, data, "Created template", 201);
});

const updateTemplate = asyncHandler(async (req, res) => {
  const data = await templatesService.updateTemplate(
    req.user.id,
    req.params.id,
    req.body,
  );
  return sendOk(res, data, "Updated template");
});

const getTemplateDesigner = asyncHandler(async (req, res) => {
  const data = await templatesService.getTemplateDesigner(
    req.user.id,
    req.params.id,
  );
  return sendOk(res, data, "Fetched template designer draft");
});

const saveTemplateDesigner = asyncHandler(async (req, res) => {
  const data = await templatesService.saveTemplateDesigner(
    req.user.id,
    req.params.id,
    req.body,
  );
  return sendOk(res, data, "Saved template designer draft");
});

const publishTemplateDesigner = asyncHandler(async (req, res) => {
  const data = await templatesService.publishTemplateDesigner(
    req.user.id,
    req.params.id,
    req.body,
  );
  return sendOk(res, data, "Published template designer version");
});

const listTemplateDesignerVersions = asyncHandler(async (req, res) => {
  const data = await templatesService.listTemplateDesignerVersions(
    req.user.id,
    req.params.id,
    req.query,
  );
  return sendOk(res, data, "Fetched template designer versions");
});

const getTemplateDesignerVersion = asyncHandler(async (req, res) => {
  const data = await templatesService.getTemplateDesignerVersion(
    req.user.id,
    req.params.id,
    req.params.versionId,
  );
  return sendOk(res, data, "Fetched template designer version");
});

const restoreTemplateDesignerVersion = asyncHandler(async (req, res) => {
  const data = await templatesService.restoreTemplateDesignerVersion(
    req.user.id,
    req.params.id,
    req.params.versionId,
  );
  return sendOk(res, data, "Restored template designer version");
});

const deleteTemplate = asyncHandler(async (req, res) => {
  const data = await templatesService.deleteTemplate(
    req.user.id,
    req.params.id,
  );
  return sendOk(res, data, "Deleted template");
});

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
