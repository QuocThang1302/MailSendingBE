const { supabase } = require("../../config/supabase");

const ACCOUNT_COLUMNS =
  "id, user_id, email_address, display_name, smtp_host, smtp_port, smtp_username, use_tls, is_default, status, daily_limit, sent_today, last_used_at, created_at";

const throwIfError = (error) => {
  if (error) {
    throw new Error(error.message);
  }
};

const unique = (values) => [...new Set(values.filter(Boolean))];

const decorateOwnerRows = async (rows) => {
  if (!rows || rows.length === 0) {
    return [];
  }

  const ownerIds = unique(rows.map((row) => row.user_id));
  const { data, error } =
    ownerIds.length > 0
      ? await supabase
          .from("users")
          .select("id, name, email")
          .in("id", ownerIds)
      : { data: [], error: null };

  throwIfError(error);

  const ownerMap = new Map((data || []).map((row) => [row.id, row]));
  return rows.map((row) => ({
    ...row,
    owner: row.user_id ? ownerMap.get(row.user_id) || null : null,
  }));
};

const listEmailAccounts = async (userId, { status } = {}) => {
  let builder = supabase
    .from("email_accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("user_id", userId);

  if (status) {
    builder = builder.eq("status", status);
  }

  const { data, error } = await builder.order("created_at", {
    ascending: false,
  });

  throwIfError(error);
  return data || [];
};

const listAllEmailAccounts = async ({ userId, status }) => {
  let builder = supabase
    .from("email_accounts")
    .select(ACCOUNT_COLUMNS);

  if (userId) {
    builder = builder.eq("user_id", userId);
  }

  if (status) {
    builder = builder.eq("status", status);
  }

  const { data, error } = await builder.order("created_at", {
    ascending: false,
  });

  throwIfError(error);
  return decorateOwnerRows(data || []);
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

const findEmailAccountByIdForAdmin = async (accountId) => {
  const { data, error } = await supabase
    .from("email_accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("id", accountId)
    .maybeSingle();

  throwIfError(error);
  const [decorated] = await decorateOwnerRows(data ? [data] : []);
  return decorated || null;
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

module.exports = {
  listEmailAccounts,
  listAllEmailAccounts,
  findEmailAccountById,
  findEmailAccountByIdForAdmin,
  findEmailAccountForSmtp,
  createEmailAccount,
  updateEmailAccount,
  deleteEmailAccount,
  setDefaultEmailAccount,
};
