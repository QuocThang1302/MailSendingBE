const asyncHandler = require("../../common/asyncHandler");
const { sendOk } = require("../../common/http");
const individualEmailsService = require("./individualEmails.service");

const sendPreview = asyncHandler(async (req, res) => {
  const data = await individualEmailsService.sendPreview(req.user.id, req.body);
  return sendOk(res, data, "Preview email sent");
});

const importRecipients = asyncHandler(async (req, res) => {
  const data = await individualEmailsService.importRecipients(req.user.id, {
    file: req.file,
  });
  return sendOk(res, data, "Imported recipients");
});

const sendEmails = asyncHandler(async (req, res) => {
  const data = await individualEmailsService.sendEmails(req.user.id, req.body);
  return sendOk(res, data, "Emails sent");
});

const listEmails = asyncHandler(async (req, res) => {
  const data = await individualEmailsService.listEmails(req.user.id, req.query);
  return sendOk(res, data, "Fetched individual emails");
});

const getEmailById = asyncHandler(async (req, res) => {
  const data = await individualEmailsService.getEmailById(
    req.user.id,
    req.params.id,
  );
  return sendOk(res, data, "Fetched individual email detail");
});

module.exports = {
  sendPreview,
  importRecipients,
  sendEmails,
  listEmails,
  getEmailById,
};
