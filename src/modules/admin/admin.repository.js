const { supabase } = require("../../config/supabase");
const { normalizeRole } = require("../../common/roles");

const USER_COLUMNS =
  "id, name, email, role, is_active, last_login, created_at, updated_at";

const throwIfError = (error) => {
  if (error) {
    throw new Error(error.message);
  }
};

const toUserDto = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: normalizeRole(row.role),
  isActive: row.is_active,
  lastLogin: row.last_login,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const countRows = async (table, extraFilter = null) => {
  let builder = supabase.from(table).select("id", {
    count: "exact",
    head: true,
  });

  if (extraFilter) {
    builder = extraFilter(builder);
  }

  const { count, error } = await builder;
  throwIfError(error);
  return count || 0;
};

const getOverview = async () => {
  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    totalContacts,
    totalEmailAccounts,
    totalTemplates,
    totalCampaigns,
    sendingCampaigns,
  ] = await Promise.all([
    countRows("users"),
    countRows("users", (builder) => builder.eq("is_active", true)),
    countRows("users", (builder) => builder.eq("is_active", false)),
    countRows("email_contacts"),
    countRows("email_accounts"),
    countRows("email_templates"),
    countRows("campaigns"),
    countRows("campaigns", (builder) =>
      builder.in("status", ["queued", "sending"]),
    ),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
    },
    resources: {
      contacts: totalContacts,
      emailAccounts: totalEmailAccounts,
      templates: totalTemplates,
      campaigns: totalCampaigns,
      sendingCampaigns,
    },
  };
};

const listUsers = async ({ page, pageSize, role, isActive }) => {
  const offset = (page - 1) * pageSize;

  let builder = supabase
    .from("users")
    .select(USER_COLUMNS, { count: "exact" });

  if (role) {
    builder = builder.eq("role", normalizeRole(role));
  }

  if (isActive !== undefined) {
    builder = builder.eq("is_active", isActive);
  }

  const { data, count, error } = await builder
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  throwIfError(error);

  return {
    total: count || 0,
    rows: (data || []).map(toUserDto),
  };
};

const findUserById = async (userId) => {
  const { data, error } = await supabase
    .from("users")
    .select(USER_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  throwIfError(error);
  return data ? toUserDto(data) : null;
};

const updateUserRole = async (userId, role) => {
  const { data, error } = await supabase
    .from("users")
    .update({
      role: normalizeRole(role),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select(USER_COLUMNS)
    .maybeSingle();

  throwIfError(error);
  return data ? toUserDto(data) : null;
};

const updateUserStatus = async (userId, isActive) => {
  const { data, error } = await supabase
    .from("users")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select(USER_COLUMNS)
    .maybeSingle();

  throwIfError(error);
  return data ? toUserDto(data) : null;
};

module.exports = {
  getOverview,
  listUsers,
  findUserById,
  updateUserRole,
  updateUserStatus,
};
