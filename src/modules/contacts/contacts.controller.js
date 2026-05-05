const asyncHandler = require("../../common/asyncHandler");
const { sendOk } = require("../../common/http");
const contactsService = require("./contacts.service");

const listContacts = asyncHandler(async (req, res) => {
  const data = await contactsService.listContacts(req.user.id, req.query);
  return sendOk(res, data, "Fetched contacts");
});

const getContactById = asyncHandler(async (req, res) => {
  const data = await contactsService.getContactById(req.user.id, req.params.id);
  return sendOk(res, data, "Fetched contact");
});

const createContact = asyncHandler(async (req, res) => {
  const data = await contactsService.createContact(req.user.id, req.body);
  return sendOk(res, data, "Created contact", 201);
});

const importContacts = asyncHandler(async (req, res) => {
  const data = await contactsService.importContacts(req.user.id, {
    file: req.file,
    mode: req.query.mode,
  });
  return sendOk(res, data, "Imported contacts");
});

const exportContacts = asyncHandler(async (req, res) => {
  const exported = await contactsService.exportContacts(req.user.id, req.query);

  res.setHeader("Content-Type", exported.contentType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${exported.fileName}"`,
  );

  return res.status(200).send(exported.buffer);
});

const updateContact = asyncHandler(async (req, res) => {
  const data = await contactsService.updateContact(
    req.user.id,
    req.params.id,
    req.body,
  );
  return sendOk(res, data, "Updated contact");
});

const deleteContact = asyncHandler(async (req, res) => {
  const data = await contactsService.deleteContact(req.user.id, req.params.id);
  return sendOk(res, data, "Deleted contact");
});

const listTags = asyncHandler(async (req, res) => {
  const data = await contactsService.listTags(req.user.id);
  return sendOk(res, data, "Fetched contact tags");
});

const createTag = asyncHandler(async (req, res) => {
  const data = await contactsService.createTag(req.user.id, req.body);
  return sendOk(res, data, "Created tag", 201);
});

const listTagRecipients = asyncHandler(async (req, res) => {
  const data = await contactsService.listTagRecipients(
    req.user.id,
    req.params.tagId,
  );
  return sendOk(res, data, "Fetched tag recipients");
});

const listDynamicFields = asyncHandler(async (req, res) => {
  const data = await contactsService.listDynamicFields(req.user.id);
  return sendOk(res, data, "Fetched dynamic fields");
});

const createDynamicField = asyncHandler(async (req, res) => {
  const data = await contactsService.createDynamicField(req.user.id, req.body);
  return sendOk(res, data, "Created dynamic field", 201);
});

const updateDynamicField = asyncHandler(async (req, res) => {
  const data = await contactsService.updateDynamicField(
    req.user.id,
    req.params.fieldId,
    req.body,
  );
  return sendOk(res, data, "Updated dynamic field");
});

const deleteDynamicField = asyncHandler(async (req, res) => {
  const data = await contactsService.deleteDynamicField(
    req.user.id,
    req.params.fieldId,
  );
  return sendOk(res, data, "Deleted dynamic field");
});

const replaceContactTags = asyncHandler(async (req, res) => {
  const data = await contactsService.replaceContactTags(
    req.user.id,
    req.params.id,
    req.body,
  );
  return sendOk(res, data, "Updated contact tags");
});

const listContactFieldValues = asyncHandler(async (req, res) => {
  const data = await contactsService.listContactFieldValues(
    req.user.id,
    req.params.id,
  );
  return sendOk(res, data, "Fetched contact custom fields");
});

const replaceContactFieldValues = asyncHandler(async (req, res) => {
  const data = await contactsService.replaceContactFieldValues(
    req.user.id,
    req.params.id,
    req.body,
  );
  return sendOk(res, data, "Updated contact custom fields");
});

module.exports = {
  listContacts,
  getContactById,
  createContact,
  importContacts,
  exportContacts,
  updateContact,
  deleteContact,
  listTags,
  createTag,
  listTagRecipients,
  listDynamicFields,
  createDynamicField,
  updateDynamicField,
  deleteDynamicField,
  replaceContactTags,
  listContactFieldValues,
  replaceContactFieldValues,
};
