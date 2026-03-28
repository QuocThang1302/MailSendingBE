const asyncHandler = require("../../common/asyncHandler");
const { sendOk } = require("../../common/http");
const emailAccountsService = require("./emailAccounts.service");

const listEmailAccounts = asyncHandler(async (req, res) => {
  const data = await emailAccountsService.listEmailAccounts(req.user.id);
  return sendOk(res, data, "Fetched email accounts");
});

const getEmailAccountById = asyncHandler(async (req, res) => {
  const data = await emailAccountsService.getEmailAccountById(
    req.user.id,
    req.params.id,
  );
  return sendOk(res, data, "Fetched email account");
});

const createEmailAccount = asyncHandler(async (req, res) => {
  const data = await emailAccountsService.createEmailAccount(
    req.user.id,
    req.body,
  );
  return sendOk(res, data, "Created email account", 201);
});

const updateEmailAccount = asyncHandler(async (req, res) => {
  const data = await emailAccountsService.updateEmailAccount(
    req.user.id,
    req.params.id,
    req.body,
  );
  return sendOk(res, data, "Updated email account");
});

const deleteEmailAccount = asyncHandler(async (req, res) => {
  const data = await emailAccountsService.deleteEmailAccount(
    req.user.id,
    req.params.id,
  );
  return sendOk(res, data, "Deleted email account");
});

const setDefaultEmailAccount = asyncHandler(async (req, res) => {
  const data = await emailAccountsService.setDefaultEmailAccount(
    req.user.id,
    req.params.id,
  );
  return sendOk(res, data, "Set default email account");
});

module.exports = {
  listEmailAccounts,
  getEmailAccountById,
  createEmailAccount,
  updateEmailAccount,
  deleteEmailAccount,
  setDefaultEmailAccount,
};
