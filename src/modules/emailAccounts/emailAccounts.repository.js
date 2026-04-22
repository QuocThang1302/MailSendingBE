const { supabase } = require("../../config/supabase");
const { sendTestEmail } = require("../campaigns/smtpMailer");

const ACCOUNT_COLUMNS =
  "id, email_address, display_name, smtp_host, smtp_port, smtp_username, use_tls, is_default, status, daily_limit, sent_today, last_used_at, created_at";

const throwIfError = (error) => {
  if (error) {
    throw new Error(error.message);
  }
};

const listEmailAccounts = async (userId) => {
  const { data, error } = await supabase
    .from("email_accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  throwIfError(error);
  return data || [];
};

const findEmailAccountById = async (userId, accountId) => {
  const { data, error } = await supabase
    .from("email_accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const findEmailAccountForSmtp = async (userId, accountId) => {
  const { data, error } = await supabase
    .from("email_accounts")
    .select(
      "id, email_address, display_name, smtp_host, smtp_port, smtp_username, smtp_password, use_tls, is_default, status, daily_limit, sent_today, last_used_at, created_at",
    )
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const createEmailAccount = async (userId, payload) => {
  if (payload.isDefault) {
    const { error: resetError } = await supabase
      .from("email_accounts")
      .update({ is_default: false })
      .eq("user_id", userId);
    throwIfError(resetError);
  }

  const { data, error } = await supabase
    .from("email_accounts")
    .insert({
      user_id: userId,
      email_address: payload.emailAddress,
      display_name: payload.displayName || null,
      smtp_host: payload.smtpHost || null,
      smtp_port: payload.smtpPort || null,
      smtp_username: payload.smtpUsername || null,
      smtp_password: payload.smtpPassword || null,
      use_tls: payload.useTls ?? true,
      is_default: payload.isDefault ?? false,
      status: payload.status || "active",
      daily_limit: payload.dailyLimit || 500,
      sent_today: 0,
    })
    .select(ACCOUNT_COLUMNS)
    .maybeSingle();

  throwIfError(error);
  return data;
};

const updateEmailAccount = async (userId, accountId, payload) => {
  if (payload.isDefault) {
    const { error: resetError } = await supabase
      .from("email_accounts")
      .update({ is_default: false })
      .eq("user_id", userId);
    throwIfError(resetError);
  }

  const fields = {
    email_address: payload.emailAddress,
    display_name: payload.displayName,
    smtp_host: payload.smtpHost,
    smtp_port: payload.smtpPort,
    smtp_username: payload.smtpUsername,
    smtp_password: payload.smtpPassword,
    use_tls: payload.useTls,
    is_default: payload.isDefault,
    status: payload.status,
    daily_limit: payload.dailyLimit,
  };

  const updates = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  );

  if (Object.keys(updates).length === 0) {
    return findEmailAccountById(userId, accountId);
  }

  const { data, error } = await supabase
    .from("email_accounts")
    .update(updates)
    .eq("id", accountId)
    .eq("user_id", userId)
    .select(ACCOUNT_COLUMNS)
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const deleteEmailAccount = async (userId, accountId) => {
  const { data, error } = await supabase
    .from("email_accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", userId)
    .select("id");

  throwIfError(error);
  return Array.isArray(data) && data.length > 0;
};

const setDefaultEmailAccount = async (userId, accountId) => {
  const exists = await findEmailAccountById(userId, accountId);
  if (!exists) {
    return null;
  }

  const { error: resetError } = await supabase
    .from("email_accounts")
    .update({ is_default: false })
    .eq("user_id", userId);
  throwIfError(resetError);

  const { data, error } = await supabase
    .from("email_accounts")
    .update({ is_default: true })
    .eq("id", accountId)
    .eq("user_id", userId)
    .select(ACCOUNT_COLUMNS)
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const sendEmailAccountTest = async (userId, accountId, payload) => {
  const account = await findEmailAccountById(userId, accountId);
  if (!account) {
    return null;
  }

  const toEmail = payload.toEmail || account.email_address;
  const subject = payload.subject || "SMTP test email";
  const text =
    payload.message ||
    "SMTP test email sent successfully from your Email Marketing Backend.";
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
      <h2 style="margin-bottom:12px;">SMTP test email</h2>
      <p>${text}</p>
      <p style="color:#6b7280;font-size:14px;">If you received this message, the SMTP configuration is working.</p>
    </div>
  `;

  const result = await sendTestEmail({
    account,
    toEmail,
    subject,
    text,
    html,
  });

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("email_accounts")
    .update({
      last_used_at: now,
      status: "active",
    })
    .eq("id", accountId)
    .eq("user_id", userId);
  throwIfError(updateError);

  return {
    sent: true,
    toEmail,
    subject,
    messageId: result.messageId,
    response: result.response,
    testedAt: now,
  };
};

module.exports = {
  listEmailAccounts,
  findEmailAccountById,
  findEmailAccountForSmtp,
  createEmailAccount,
  updateEmailAccount,
  deleteEmailAccount,
  setDefaultEmailAccount,
  sendEmailAccountTest,
};
