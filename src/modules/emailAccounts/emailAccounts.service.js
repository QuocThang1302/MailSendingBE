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

const sendEmailAccountTest = async (userId, accountId, payload) => {
  try {
    const result = await emailAccountsRepository.sendEmailAccountTest(
      userId,
      accountId,
      payload,
    );
    if (!result) {
      throw new ApiError(404, "Email account not found");
    }
    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.message === "EMAIL_ACCOUNT_NOT_FOUND") {
      throw new ApiError(404, "Email account not found");
    }
    if (error.message === "EMAIL_ACCOUNT_INACTIVE") {
      throw new ApiError(409, "Email account is inactive");
    }
    if (error.message === "SMTP_HOST_REQUIRED") {
      throw new ApiError(400, "SMTP host is required for this email account");
    }
    if (error.message === "SMTP_FROM_ADDRESS_REQUIRED") {
      throw new ApiError(
        400,
        "Email account must have a sender email address",
      );
    }
    throw new ApiError(502, error.message || "SMTP test failed");
  }
};

module.exports = {
  listEmailAccounts,
  getEmailAccountById,
  createEmailAccount,
  updateEmailAccount,
  deleteEmailAccount,
  setDefaultEmailAccount,
  sendEmailAccountTest,
};
