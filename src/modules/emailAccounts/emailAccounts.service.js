const ApiError = require("../../common/ApiError");
const emailAccountsRepository = require("./emailAccounts.repository");

const listEmailAccounts = async (userId) => {
  return emailAccountsRepository.listEmailAccounts(userId);
};

const getEmailAccountById = async (userId, accountId) => {
  const account = await emailAccountsRepository.findEmailAccountById(
    userId,
    accountId,
  );
  if (!account) {
    throw new ApiError(404, "Email account not found");
  }
  return account;
};

const createEmailAccount = async (userId, payload) => {
  return emailAccountsRepository.createEmailAccount(userId, payload);
};

const updateEmailAccount = async (userId, accountId, payload) => {
  const updated = await emailAccountsRepository.updateEmailAccount(
    userId,
    accountId,
    payload,
  );
  if (!updated) {
    throw new ApiError(404, "Email account not found");
  }
  return updated;
};

const deleteEmailAccount = async (userId, accountId) => {
  const removed = await emailAccountsRepository.deleteEmailAccount(
    userId,
    accountId,
  );
  if (!removed) {
    throw new ApiError(404, "Email account not found");
  }
  return { deleted: true };
};

const setDefaultEmailAccount = async (userId, accountId) => {
  const updated = await emailAccountsRepository.setDefaultEmailAccount(
    userId,
    accountId,
  );
  if (!updated) {
    throw new ApiError(404, "Email account not found");
  }
  return updated;
};

module.exports = {
  listEmailAccounts,
  getEmailAccountById,
  createEmailAccount,
  updateEmailAccount,
  deleteEmailAccount,
  setDefaultEmailAccount,
};
