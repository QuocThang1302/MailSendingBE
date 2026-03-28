const ApiError = require("../../common/ApiError");
const contactsRepository = require("./contacts.repository");

const listContacts = async (userId, filters) => {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;

  const result = await contactsRepository.listContacts(userId, {
    ...filters,
    page,
    pageSize,
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

const getContactById = async (userId, contactId) => {
  const contact = await contactsRepository.findContactById(userId, contactId);
  if (!contact) {
    throw new ApiError(404, "Contact not found");
  }

  const tags = await contactsRepository.getContactTags(contactId);
  return {
    ...contact,
    tags,
  };
};

const createContact = async (userId, payload) => {
  return contactsRepository.createContact(userId, payload);
};

const updateContact = async (userId, contactId, payload) => {
  const updated = await contactsRepository.updateContact(
    userId,
    contactId,
    payload,
  );
  if (!updated) {
    throw new ApiError(404, "Contact not found");
  }
  return updated;
};

const deleteContact = async (userId, contactId) => {
  const removed = await contactsRepository.deleteContact(userId, contactId);
  if (!removed) {
    throw new ApiError(404, "Contact not found");
  }
  return { deleted: true };
};

const listTags = async (userId) => {
  return contactsRepository.listTags(userId);
};

const createTag = async (userId, payload) => {
  return contactsRepository.createTag(userId, payload);
};

const replaceContactTags = async (userId, contactId, payload) => {
  const tags = await contactsRepository.replaceContactTags(
    userId,
    contactId,
    payload.tagIds,
  );
  if (!tags) {
    throw new ApiError(404, "Contact not found");
  }
  return tags;
};

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
