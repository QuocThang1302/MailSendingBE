const ApiError = require("../../common/ApiError");
const nodemailer = require("nodemailer");
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

const testSmtpConnection = async (userId, payload) => {
  let storedAccount = null;
  if (payload.accountId) {
    storedAccount = await emailAccountsRepository.findEmailAccountForSmtp(
      userId,
      payload.accountId,
    );
    if (!storedAccount) {
      throw new ApiError(404, "Email account not found");
    }
  }

  const account = {
    emailAddress:
      payload.emailAddress || storedAccount?.email_address || undefined,
    displayName:
      payload.displayName !== undefined
        ? payload.displayName
        : storedAccount?.display_name,
    smtpHost: payload.smtpHost || storedAccount?.smtp_host || undefined,
    smtpPort: payload.smtpPort || storedAccount?.smtp_port || undefined,
    smtpUsername:
      payload.smtpUsername || storedAccount?.smtp_username || undefined,
    smtpPassword:
      payload.smtpPassword || storedAccount?.smtp_password || undefined,
    useTls:
      payload.useTls !== undefined
        ? payload.useTls
        : storedAccount?.use_tls ?? true,
  };

  if (!account.smtpHost || !account.smtpPort || !account.smtpUsername) {
    throw new ApiError(400, "SMTP host, port, and username are required");
  }

  if (!account.smtpPassword) {
    throw new ApiError(400, "SMTP password is required");
  }

  const port = Number(account.smtpPort);
  const secure = port === 465;

  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port,
    secure,
    requireTLS: account.useTls === true && !secure,
    auth: {
      user: account.smtpUsername,
      pass: account.smtpPassword,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });

  try {
    await transporter.verify();
  } catch (error) {
    throw new ApiError(502, "SMTP connection failed", {
      reason: error instanceof Error ? error.message : "Unknown SMTP error",
    });
  }

  return {
    ok: true,
    host: account.smtpHost,
    port,
    username: account.smtpUsername,
    secure,
    useTls: account.useTls === true,
    accountEmail: account.emailAddress || null,
  };
};

module.exports = {
  listEmailAccounts,
  getEmailAccountById,
  createEmailAccount,
  updateEmailAccount,
  deleteEmailAccount,
  setDefaultEmailAccount,
  testSmtpConnection,
};
