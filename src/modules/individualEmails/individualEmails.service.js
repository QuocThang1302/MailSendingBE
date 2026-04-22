const nodemailer = require("nodemailer");

const ApiError = require("../../common/ApiError");
const individualEmailsRepository = require("./individualEmails.repository");

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const textToHtml = (value) =>
  `<div style="font-family: Arial, sans-serif; white-space: pre-wrap;">${escapeHtml(
    value,
  ).replace(/\n/g, "<br />")}</div>`;

const toSafeMessage = (value) =>
  String(value || "Unknown SMTP error").slice(0, 255);

const buildDisplayName = (contact, email) => {
  const firstName = String(contact?.first_name || "").trim();
  const lastName = String(contact?.last_name || "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) {
    return fullName;
  }
  return normalizeEmail(email).split("@")[0] || "Customer";
};

const applyMergeTags = (template, context) =>
  String(template || "")
    .replace(/\{\{\s*name\s*\}\}/gi, context.name)
    .replace(/\{\{\s*email\s*\}\}/gi, context.email)
    .replace(/\{\{\s*phone\s*\}\}/gi, context.phone);

const buildTransport = (account) => {
  const port = Number(account.smtp_port || 0) || 587;
  const secure = port === 465;

  return nodemailer.createTransport({
    host: account.smtp_host,
    port,
    secure,
    requireTLS: account.use_tls === true && !secure,
    auth: {
      user: account.smtp_username,
      pass: account.smtp_password,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
};

const ensureSendingAccount = async (userId, emailAccountId) => {
  const account = await individualEmailsRepository.getSendingAccount(
    userId,
    emailAccountId,
  );

  if (!account) {
    throw new ApiError(
      404,
      emailAccountId
        ? "Selected email account not found or inactive"
        : "No active email account available",
    );
  }

  if (
    !account.smtp_host ||
    !account.smtp_port ||
    !account.smtp_username ||
    !account.smtp_password
  ) {
    throw new ApiError(
      409,
      "Selected email account is missing SMTP configuration",
    );
  }

  return account;
};

const ensureDailyLimit = (account, requestedCount) => {
  const dailyLimit = Number(account.daily_limit || 0);
  const sentToday = Number(account.sent_today || 0);

  if (!dailyLimit) {
    return;
  }

  if (sentToday + requestedCount > dailyLimit) {
    throw new ApiError(409, "Daily sending limit exceeded for this email account", {
      dailyLimit,
      sentToday,
      requestedCount,
      remaining: Math.max(0, dailyLimit - sentToday),
    });
  }
};

const buildContactsMap = (rows) =>
  new Map(rows.map((row) => [normalizeEmail(row.email), row]));

const parseRecipients = (recipients) => {
  const normalized = [...new Set((recipients || []).map(normalizeEmail).filter(Boolean))];
  if (normalized.length === 0) {
    throw new ApiError(400, "At least one recipient is required");
  }
  return normalized;
};

const sendBatch = async (userId, payload, mode) => {
  const recipients =
    mode === "preview"
      ? [normalizeEmail(payload.previewEmail)]
      : parseRecipients(payload.recipients);

  const account = await ensureSendingAccount(userId, payload.emailAccountId);
  ensureDailyLimit(account, recipients.length);

  const contacts = await individualEmailsRepository.findContactsForEmails(
    userId,
    recipients,
  );
  const contactsMap = buildContactsMap(contacts);
  const transporter = buildTransport(account);

  try {
    await transporter.verify();
  } catch (error) {
    throw new ApiError(502, "SMTP connection failed", {
      reason: error instanceof Error ? error.message : "Unknown SMTP error",
    });
  }

  const defaultHtml = payload.htmlContent || textToHtml(payload.content);
  const fromHeader = account.display_name
    ? `"${account.display_name}" <${account.email_address}>`
    : account.email_address;

  const results = [];
  const logs = [];
  let sentCount = 0;

  for (const email of recipients) {
    const contact = contactsMap.get(email) || null;
    const context = {
      name: buildDisplayName(contact, email),
      email,
      phone: String(contact?.phone || ""),
    };

    const renderedSubject = applyMergeTags(payload.subject, context);
    const renderedText = applyMergeTags(payload.content, context);
    const renderedHtml = applyMergeTags(defaultHtml, context);
    const now = new Date().toISOString();

    try {
      const info = await transporter.sendMail({
        from: fromHeader,
        to: email,
        subject: renderedSubject,
        text: renderedText,
        html: renderedHtml,
      });

      sentCount += 1;
      results.push({
        email,
        status: "sent",
        messageId: info.messageId || null,
      });
      logs.push({
        user_id: userId,
        contact_id: contact?.id || null,
        email,
        status: "sent",
        message:
          mode === "preview" ? "Preview email sent" : "Individual email sent",
        sent_time: now,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown SMTP error";
      results.push({
        email,
        status: "failed",
        error: message,
      });
      logs.push({
        user_id: userId,
        contact_id: contact?.id || null,
        email,
        status: "failed",
        message: toSafeMessage(message),
        sent_time: now,
      });
    }
  }

  await individualEmailsRepository.insertEmailLogs(logs);
  await individualEmailsRepository.incrementAccountUsage(
    userId,
    account.id,
    sentCount,
  );

  const failedCount = recipients.length - sentCount;
  if (sentCount === 0) {
    const firstFailure = results.find((item) => item.status === "failed");
    throw new ApiError(
      502,
      mode === "preview"
        ? "Failed to send preview email"
        : "Failed to send emails",
      {
        reason: firstFailure?.error || "Unknown SMTP error",
        results,
      },
    );
  }

  return {
    mode,
    account: {
      id: account.id,
      emailAddress: account.email_address,
      displayName: account.display_name || null,
    },
    requestedCount: recipients.length,
    sentCount,
    failedCount,
    results,
  };
};

const sendPreview = async (userId, payload) =>
  sendBatch(userId, payload, "preview");

const sendEmails = async (userId, payload) => sendBatch(userId, payload, "send");

module.exports = {
  sendPreview,
  sendEmails,
};
