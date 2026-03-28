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

const replaceContactTags = asyncHandler(async (req, res) => {
  const data = await contactsService.replaceContactTags(
    req.user.id,
    req.params.id,
    req.body,
  );
  return sendOk(res, data, "Updated contact tags");
});

module.exports = {
  listContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  listTags,
  createTag,
  replaceContactTags,
};
