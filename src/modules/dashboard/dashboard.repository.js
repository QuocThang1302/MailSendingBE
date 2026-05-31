const { supabase } = require("../../config/supabase");

const throwIfError = (error) => {
  if (error) {
    throw new Error(error.message);
  }
};

const countRows = async (table, userId, extraFilter = null) => {
  let builder = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (extraFilter) {
    builder = extraFilter(builder);
  }

  const { count, error } = await builder;
  throwIfError(error);
  return count || 0;
};

const countRowsGlobal = async (table, extraFilter = null) => {
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

const sumCampaignField = async (userId, field) => {
  const { data, error } = await supabase
    .from("campaigns")
    .select(field)
    .eq("user_id", userId);

  throwIfError(error);
  return (data || []).reduce((acc, row) => acc + Number(row[field] || 0), 0);
};

const sumCampaignFieldGlobal = async (field) => {
  const { data, error } = await supabase.from("campaigns").select(field);

  throwIfError(error);
  return (data || []).reduce((acc, row) => acc + Number(row[field] || 0), 0);
};

const getOverview = async (userId) => {
  const [
    totalAccounts,
    activeAccounts,
    activeContacts,
    activeTemplates,
    totalCampaigns,
    totalSent,
    totalOpened,
    totalClicked,
    recentActivityResult,
  ] = await Promise.all([
    countRows("email_accounts", userId),
    countRows("email_accounts", userId, (builder) =>
      builder.eq("status", "active"),
    ),
    countRows("email_contacts", userId, (builder) =>
      builder.eq("email_status", "active"),
    ),
    countRows("email_templates", userId, (builder) =>
      builder.eq("is_active", true),
    ),
    countRows("campaigns", userId),
    sumCampaignField(userId, "sent_count"),
    sumCampaignField(userId, "open_count"),
    sumCampaignField(userId, "click_count"),
    supabase
      .from("email_logs")
      .select("id, campaign_id, contact_id, email, status, message, sent_time")
      .eq("user_id", userId)
      .order("sent_time", { ascending: false })
      .limit(10),
  ]);

  throwIfError(recentActivityResult.error);

  return {
    stats: {
      total_accounts: totalAccounts,
      active_accounts: activeAccounts,
      active_contacts: activeContacts,
      active_templates: activeTemplates,
      total_campaigns: totalCampaigns,
      total_sent: totalSent,
      total_opened: totalOpened,
      total_clicked: totalClicked,
    },
    recentActivity: recentActivityResult.data || [],
  };
};

const getSystemOverview = async () => {
  const [
    totalUsers,
    activeUsers,
    totalAccounts,
    activeAccounts,
    activeContacts,
    activeTemplates,
    totalCampaigns,
    totalSent,
    totalOpened,
    totalClicked,
    recentActivityResult,
  ] = await Promise.all([
    countRowsGlobal("users"),
    countRowsGlobal("users", (builder) => builder.eq("is_active", true)),
    countRowsGlobal("email_accounts"),
    countRowsGlobal("email_accounts", (builder) =>
      builder.eq("status", "active"),
    ),
    countRowsGlobal("email_contacts", (builder) =>
      builder.eq("email_status", "active"),
    ),
    countRowsGlobal("email_templates", (builder) =>
      builder.eq("is_active", true),
    ),
    countRowsGlobal("campaigns"),
    sumCampaignFieldGlobal("sent_count"),
    sumCampaignFieldGlobal("open_count"),
    sumCampaignFieldGlobal("click_count"),
    supabase
      .from("email_logs")
      .select(
        "id, user_id, campaign_id, contact_id, email, status, message, sent_time",
      )
      .order("sent_time", { ascending: false })
      .limit(10),
  ]);

  throwIfError(recentActivityResult.error);

  return {
    scope: "system",
    stats: {
      total_users: totalUsers,
      active_users: activeUsers,
      total_accounts: totalAccounts,
      active_accounts: activeAccounts,
      active_contacts: activeContacts,
      active_templates: activeTemplates,
      total_campaigns: totalCampaigns,
      total_sent: totalSent,
      total_opened: totalOpened,
      total_clicked: totalClicked,
    },
    recentActivity: recentActivityResult.data || [],
  };
};

module.exports = {
  getOverview,
  getSystemOverview,
};
