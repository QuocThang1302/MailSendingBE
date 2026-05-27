const { supabase } = require("../../config/supabase");

const ACCOUNT_SEND_COLUMNS =
  "id, email_address, display_name, smtp_host, smtp_port, smtp_username, smtp_password, use_tls, is_default, status, daily_limit, sent_today, last_used_at, created_at";

const throwIfError = (error) => {
  if (error) {
    throw new Error(error.message);
  }
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const INDIVIDUAL_EMAIL_COLUMNS =
  "id, contact_id, email, email_account_id, subject, content_html, content_text, status, sent_time, open_time, click_time, open_count, click_count, error_message, created_at";

const getSendingAccount = async (userId, emailAccountId) => {
  let builder = supabase
    .from("email_accounts")
    .select(ACCOUNT_SEND_COLUMNS)
    .eq("user_id", userId)
    .eq("status", "active");

  if (emailAccountId) {
    const { data, error } = await builder
      .eq("id", emailAccountId)
      .maybeSingle();
    throwIfError(error);
    return data || null;
  }

  const { data, error } = await builder
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);

  throwIfError(error);
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
};

const findContactsForEmails = async (userId, emails) => {
  const normalizedEmails = [...new Set(emails.map(normalizeEmail).filter(Boolean))];
  if (normalizedEmails.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("email_contacts")
    .select("id, email, first_name, last_name, phone")
    .eq("user_id", userId)
    .in("email", normalizedEmails);

  throwIfError(error);
  return data || [];
};

const insertEmailLogs = async (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("email_logs").insert(rows);
  throwIfError(error);
};

const createIndividualEmail = async (userId, row) => {
  const { data, error } = await supabase
    .from("individual_emails")
    .insert({
      user_id: userId,
      contact_id: row.contactId || null,
      email: normalizeEmail(row.email),
      email_account_id: row.emailAccountId,
      subject: row.subject,
      content_html: row.contentHtml,
      content_text: row.contentText,
      status: "draft",
    })
    .select("id")
    .maybeSingle();
  throwIfError(error);
  return data;
};

const updateIndividualEmailResult = async (userId, emailId, updates) => {
  const { error } = await supabase
    .from("individual_emails")
    .update(updates)
    .eq("id", emailId)
    .eq("user_id", userId);
  throwIfError(error);
};

const listIndividualEmails = async (userId, { page, pageSize }) => {
  const offset = (page - 1) * pageSize;
  const { data, count, error } = await supabase
    .from("individual_emails")
    .select(INDIVIDUAL_EMAIL_COLUMNS, { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);
  throwIfError(error);

  return { total: count || 0, rows: data || [] };
};

const findIndividualEmailById = async (userId, emailId) => {
  const { data, error } = await supabase
    .from("individual_emails")
    .select(INDIVIDUAL_EMAIL_COLUMNS)
    .eq("id", emailId)
    .eq("user_id", userId)
    .maybeSingle();
  throwIfError(error);
  if (!data) {
    return null;
  }

  const { data: events, error: eventsError } = await supabase
    .from("email_tracking")
    .select("id, event_type, clicked_url, ip_address, user_agent, event_time")
    .eq("individual_email_id", emailId)
    .order("event_time", { ascending: false })
    .limit(100);
  throwIfError(eventsError);

  return { ...data, trackingEvents: events || [] };
};

const incrementAccountUsage = async (userId, accountId, successCount) => {
  if (!accountId || successCount <= 0) {
    return null;
  }

  const { data: account, error: accountError } = await supabase
    .from("email_accounts")
    .select("id, sent_today")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  throwIfError(accountError);

  if (!account) {
    return null;
  }

  const nextSentToday = Number(account.sent_today || 0) + successCount;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("email_accounts")
    .update({
      sent_today: nextSentToday,
      last_used_at: now,
    })
    .eq("id", accountId)
    .eq("user_id", userId)
    .select("id, sent_today, last_used_at")
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

module.exports = {
  getSendingAccount,
  findContactsForEmails,
  insertEmailLogs,
  createIndividualEmail,
  updateIndividualEmailResult,
  listIndividualEmails,
  findIndividualEmailById,
  incrementAccountUsage,
};
