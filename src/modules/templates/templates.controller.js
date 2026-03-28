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
  deleteTemplate,
};
