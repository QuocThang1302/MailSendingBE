const { supabase } = require("../../config/supabase");
const { renderCampaignEmail, sendCampaignEmail } = require("./smtpMailer");

const CAMPAIGN_COLUMNS =
  "id, campaign_name, template_id, email_account_id, segment_id, status, campaign_type, scheduled_time, started_at, completed_at, total_recipients, sent_count, open_count, click_count, bounce_count, unsubscribe_count, created_at, updated_at";
const RECIPIENT_COLUMNS =
  "id, contact_id, email, status, rendered_subject, sent_time, open_time, click_time, open_count, click_count, error_message";

const throwIfError = (error) => {
  if (error) {
    throw new Error(error.message);
  }
};

const unique = (values) => [...new Set(values.filter(Boolean))];
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const EMAIL_ACCOUNT_SEND_COLUMNS =
  "id, email_address, display_name, smtp_host, smtp_port, smtp_username, smtp_password, use_tls, status, daily_limit, sent_today, last_used_at";
const TEMPLATE_SEND_COLUMNS =
  "id, template_name, subject, preview_text, content_html, content_text, is_active";

const decorateCampaignRows = async (rows) => {
  if (!rows || rows.length === 0) {
    return [];
  }

  const templateIds = unique(rows.map((row) => row.template_id));
  const accountIds = unique(rows.map((row) => row.email_account_id));
  const segmentIds = unique(rows.map((row) => row.segment_id));

  const [templatesResult, accountsResult, segmentsResult] = await Promise.all([
    templateIds.length > 0
      ? supabase
          .from("email_templates")
          .select("id, template_name")
          .in("id", templateIds)
      : Promise.resolve({ data: [], error: null }),
    accountIds.length > 0
      ? supabase
          .from("email_accounts")
          .select("id, email_address")
          .in("id", accountIds)
      : Promise.resolve({ data: [], error: null }),
    segmentIds.length > 0
      ? supabase
          .from("contact_segments")
          .select("id, segment_name")
          .in("id", segmentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  throwIfError(templatesResult.error);
  throwIfError(accountsResult.error);
  throwIfError(segmentsResult.error);

  const templateMap = new Map(
    (templatesResult.data || []).map((row) => [row.id, row.template_name]),
  );
  const accountMap = new Map(
    (accountsResult.data || []).map((row) => [row.id, row.email_address]),
  );
  const segmentMap = new Map(
    (segmentsResult.data || []).map((row) => [row.id, row.segment_name]),
  );

  return rows.map((row) => ({
    ...row,
    template_name: row.template_id
      ? templateMap.get(row.template_id) || null
      : null,
    sender_email: row.email_account_id
      ? accountMap.get(row.email_account_id) || null
      : null,
    segment_name: row.segment_id
      ? segmentMap.get(row.segment_id) || null
      : null,
  }));
};

const listCampaigns = async (userId, { page, pageSize, status }) => {
  const offset = (page - 1) * pageSize;

  let builder = supabase
    .from("campaigns")
    .select(CAMPAIGN_COLUMNS, { count: "exact" })
    .eq("user_id", userId);

  if (status) {
    builder = builder.eq("status", status);
  }

  const { data, count, error } = await builder
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  throwIfError(error);

  const decoratedRows = await decorateCampaignRows(data || []);

  return {
    total: count || 0,
    rows: decoratedRows,
  };
};

const findCampaignById = async (userId, campaignId) => {
  const { data: campaignRow, error: campaignError } = await supabase
    .from("campaigns")
    .select(CAMPAIGN_COLUMNS)
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  throwIfError(campaignError);

  if (!campaignRow) {
    return null;
  }

  const [decorated] = await decorateCampaignRows([campaignRow]);

  const { data: recipients, error: recipientsError } = await supabase
    .from("campaign_recipients")
    .select("status")
    .eq("campaign_id", campaignId);

  throwIfError(recipientsError);

  const recipientsByStatus = (recipients || []).reduce((acc, row) => {
    const key = row.status || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    ...decorated,
    recipientsByStatus,
  };
};

const listCampaignRecipients = async (
  userId,
  campaignId,
  { page, pageSize, status },
) => {
  const { data: ownership, error: ownershipError } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  throwIfError(ownershipError);

  if (!ownership) {
    return null;
  }

  const offset = (page - 1) * pageSize;

  let builder = supabase
    .from("campaign_recipients")
    .select(RECIPIENT_COLUMNS, { count: "exact" })
    .eq("campaign_id", campaignId);

  if (status) {
    builder = builder.eq("status", status);
  }

  const { data, count, error } = await builder
    .order("id", { ascending: false })
    .range(offset, offset + pageSize - 1);

  throwIfError(error);

  return {
    total: count || 0,
    rows: data || [],
  };
};

const findCampaignRecipientById = async (userId, campaignId, recipientId) => {
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, campaign_name, user_id")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();
  throwIfError(campaignError);

  if (!campaign) {
    return null;
  }

  const { data: recipient, error: recipientError } = await supabase
    .from("campaign_recipients")
    .select(
      "id, campaign_id, contact_id, email, status, rendered_subject, rendered_html, sent_time, open_time, click_time, open_count, click_count, error_message",
    )
    .eq("id", recipientId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  throwIfError(recipientError);

  if (!recipient) {
    return null;
  }

  const { data: events, error: eventsError } = await supabase
    .from("email_tracking")
    .select("id, event_type, clicked_url, ip_address, user_agent, event_time")
    .eq("campaign_recipient_id", recipientId)
    .order("event_time", { ascending: false })
    .limit(100);
  throwIfError(eventsError);

  return {
    ...recipient,
    campaign_name: campaign.campaign_name,
    trackingEvents: events || [],
  };
};

const ensureTemplateExists = async (templateId) => {
  const { data, error } = await supabase
    .from("email_templates")
    .select("id")
    .eq("id", templateId)
    .maybeSingle();
  throwIfError(error);
  if (!data) {
    throw new Error("TEMPLATE_NOT_FOUND");
  }
};

const ensureEmailAccountExists = async (userId, emailAccountId) => {
  const { data, error } = await supabase
    .from("email_accounts")
    .select("id")
    .eq("id", emailAccountId)
    .eq("user_id", userId)
    .maybeSingle();
  throwIfError(error);
  if (!data) {
    throw new Error("EMAIL_ACCOUNT_NOT_FOUND");
  }
};

const ensureSegmentExists = async (userId, segmentId) => {
  if (!segmentId) {
    return;
  }

  const { data, error } = await supabase
    .from("contact_segments")
    .select("id")
    .eq("id", segmentId)
    .eq("user_id", userId)
    .maybeSingle();
  throwIfError(error);
  if (!data) {
    throw new Error("SEGMENT_NOT_FOUND");
  }
};

const getRecipientsForPayload = async (userId, payload) => {
  const importedEmails = Array.isArray(payload.recipientEmails)
    ? unique(payload.recipientEmails.map(normalizeEmail))
    : [];

  if (Array.isArray(payload.recipientEmails) && importedEmails.length === 0) {
    return [];
  }

  if (importedEmails.length > 0) {
    const { data: contacts, error: contactsError } = await supabase
      .from("email_contacts")
      .select("id, email")
      .eq("user_id", userId)
      .eq("email_status", "active")
      .in("email", importedEmails);
    throwIfError(contactsError);

    const contactMap = new Map(
      (contacts || []).map((row) => [normalizeEmail(row.email), row.id]),
    );

    return importedEmails.map((email) => ({
      id: contactMap.get(email) || null,
      email,
    }));
  }

  const segmentId = payload.segmentId || null;
  if (segmentId) {
    const { data: segmentRows, error: segmentMapError } = await supabase
      .from("contact_segment_map")
      .select("contact_id")
      .eq("segment_id", segmentId);
    throwIfError(segmentMapError);

    const contactIds = unique((segmentRows || []).map((row) => row.contact_id));
    if (contactIds.length === 0) {
      return [];
    }

    const { data: contactRows, error: contactRowsError } = await supabase
      .from("email_contacts")
      .select("id, email")
      .eq("user_id", userId)
      .eq("email_status", "active")
      .in("id", contactIds);
    throwIfError(contactRowsError);
    return contactRows || [];
  }

  if (Array.isArray(payload.contactIds) && payload.contactIds.length === 0) {
    return [];
  }

  if (Array.isArray(payload.contactIds) && payload.contactIds.length > 0) {
    const selectedIds = unique(payload.contactIds);
    const { data: selectedRows, error: selectedRowsError } = await supabase
      .from("email_contacts")
      .select("id, email")
      .eq("user_id", userId)
      .eq("email_status", "active")
      .in("id", selectedIds);
    throwIfError(selectedRowsError);
    return selectedRows || [];
  }

  const { data: allRows, error: allRowsError } = await supabase
    .from("email_contacts")
    .select("id, email")
    .eq("user_id", userId)
    .eq("email_status", "active");
  throwIfError(allRowsError);
  return allRows || [];
};

const replaceCampaignRecipients = async (campaignId, recipients) => {
  const { error: deleteError } = await supabase
    .from("campaign_recipients")
    .delete()
    .eq("campaign_id", campaignId);
  throwIfError(deleteError);

  if (recipients.length === 0) {
    return;
  }

  const recipientRows = recipients.map((row) => ({
    campaign_id: campaignId,
    contact_id: row.id || null,
    email: normalizeEmail(row.email),
    status: "pending",
  }));

  const { error } = await supabase
    .from("campaign_recipients")
    .insert(recipientRows);
  throwIfError(error);
};

const createCampaign = async (userId, payload) => {
  await ensureTemplateExists(payload.templateId);
  await ensureEmailAccountExists(userId, payload.emailAccountId);

  const segmentId = payload.segmentId || null;
  await ensureSegmentExists(userId, segmentId);

  const { data: campaignData, error: campaignInsertError } = await supabase
    .from("campaigns")
    .insert({
      user_id: userId,
      campaign_name: payload.campaignName,
      template_id: payload.templateId,
      email_account_id: payload.emailAccountId,
      segment_id: segmentId,
      status: payload.scheduledTime ? "scheduled" : "draft",
      campaign_type: payload.campaignType || "regular",
      scheduled_time: payload.scheduledTime || null,
      total_recipients: 0,
      sent_count: 0,
      open_count: 0,
      click_count: 0,
      bounce_count: 0,
      unsubscribe_count: 0,
    })
    .select(
      "id, campaign_name, template_id, email_account_id, segment_id, status, campaign_type, scheduled_time, created_at",
    )
    .maybeSingle();
  throwIfError(campaignInsertError);

  const recipients = await getRecipientsForPayload(userId, payload);
  await replaceCampaignRecipients(campaignData.id, recipients);

  const { error: campaignUpdateError } = await supabase
    .from("campaigns")
    .update({ total_recipients: recipients.length })
    .eq("id", campaignData.id);
  throwIfError(campaignUpdateError);

  return {
    ...campaignData,
    total_recipients: recipients.length,
  };
};

const updateCampaign = async (userId, campaignId, payload) => {
  const { data: existing, error: existingError } = await supabase
    .from("campaigns")
    .select("id, status, template_id, email_account_id, segment_id")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();
  throwIfError(existingError);

  if (!existing) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  if (["sending", "sent"].includes(existing.status)) {
    throw new Error("CAMPAIGN_LOCKED");
  }

  const nextTemplateId = payload.templateId || existing.template_id;
  const nextEmailAccountId = payload.emailAccountId || existing.email_account_id;
  const nextSegmentId =
    Object.prototype.hasOwnProperty.call(payload, "segmentId")
      ? payload.segmentId || null
      : existing.segment_id;

  await ensureTemplateExists(nextTemplateId);
  await ensureEmailAccountExists(userId, nextEmailAccountId);
  await ensureSegmentExists(userId, nextSegmentId);

  const updates = {
    updated_at: new Date().toISOString(),
  };

  if (payload.campaignName !== undefined) {
    updates.campaign_name = payload.campaignName;
  }
  if (payload.templateId !== undefined) {
    updates.template_id = payload.templateId;
  }
  if (payload.emailAccountId !== undefined) {
    updates.email_account_id = payload.emailAccountId;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "segmentId")) {
    updates.segment_id = nextSegmentId;
  }
  if (payload.campaignType !== undefined) {
    updates.campaign_type = payload.campaignType;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "scheduledTime")) {
    updates.scheduled_time = payload.scheduledTime || null;
    updates.status = payload.scheduledTime ? "scheduled" : "draft";
  }

  const shouldReplaceRecipients =
    Array.isArray(payload.recipientEmails) ||
    Array.isArray(payload.contactIds) ||
    Object.prototype.hasOwnProperty.call(payload, "segmentId");

  let totalRecipients;
  if (shouldReplaceRecipients) {
    const recipientPayload = {
      ...payload,
      segmentId: nextSegmentId,
    };
    const recipients = await getRecipientsForPayload(userId, recipientPayload);
    await replaceCampaignRecipients(campaignId, recipients);
    totalRecipients = recipients.length;
    updates.total_recipients = totalRecipients;
    updates.sent_count = 0;
    updates.open_count = 0;
    updates.click_count = 0;
    updates.bounce_count = 0;
    updates.unsubscribe_count = 0;
  }

  const { data: updated, error: updateError } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("id", campaignId)
    .eq("user_id", userId)
    .select(CAMPAIGN_COLUMNS)
    .maybeSingle();
  throwIfError(updateError);

  const [decorated] = await decorateCampaignRows([updated]);
  return {
    ...decorated,
    total_recipients: totalRecipients ?? decorated.total_recipients,
  };
};

const validateCampaignDispatch = (campaign, template, emailAccount) => {
  if (!template) {
    throw new Error("TEMPLATE_NOT_FOUND");
  }

  if (!template.is_active) {
    throw new Error("TEMPLATE_INACTIVE");
  }

  if (!emailAccount) {
    throw new Error("EMAIL_ACCOUNT_NOT_FOUND");
  }

  if (emailAccount.status && emailAccount.status !== "active") {
    throw new Error("EMAIL_ACCOUNT_INACTIVE");
  }

  if (!emailAccount.smtp_host) {
    throw new Error("SMTP_HOST_REQUIRED");
  }

  if (!emailAccount.email_address) {
    throw new Error("SMTP_FROM_ADDRESS_REQUIRED");
  }
};

const updateCampaignRecipientResult = async ({
  recipientId,
  status,
  renderedSubject,
  renderedHtml,
  errorMessage,
  sentTime,
}) => {
  const updates = {
    status,
    rendered_subject: renderedSubject || null,
    rendered_html: renderedHtml || null,
    error_message: errorMessage || null,
  };

  if (sentTime) {
    updates.sent_time = sentTime;
  }

  const { error } = await supabase
    .from("campaign_recipients")
    .update(updates)
    .eq("id", recipientId);

  throwIfError(error);
};

const isCampaignPaused = async (userId, campaignId) => {
  const { data, error } = await supabase
    .from("campaigns")
    .select("status")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  throwIfError(error);
  return data?.status === "paused";
};

const startCampaign = async (userId, campaignId) => {
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select(
      "id, status, started_at, total_recipients, sent_count, template_id, email_account_id",
    )
    .eq("id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  throwIfError(campaignError);

  if (!campaign) {
    return null;
  }

  if (!["draft", "scheduled", "paused", "queued"].includes(campaign.status)) {
    throw new Error("INVALID_CAMPAIGN_STATUS");
  }

  const now = new Date().toISOString();

  const [
    { data: template, error: templateError },
    { data: emailAccount, error: emailAccountError },
  ] = await Promise.all([
    supabase
      .from("email_templates")
      .select(TEMPLATE_SEND_COLUMNS)
      .eq("id", campaign.template_id)
      .maybeSingle(),
    supabase
      .from("email_accounts")
      .select(EMAIL_ACCOUNT_SEND_COLUMNS)
      .eq("id", campaign.email_account_id)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  throwIfError(templateError);
  throwIfError(emailAccountError);
  validateCampaignDispatch(campaign, template, emailAccount);

  const { data: claimedCampaign, error: markSendingError } = await supabase
    .from("campaigns")
    .update({
      status: "sending",
      started_at: campaign.started_at || now,
      updated_at: now,
    })
    .eq("id", campaignId)
    .eq("user_id", userId)
    .eq("status", campaign.status)
    .select("id")
    .maybeSingle();
  throwIfError(markSendingError);

  if (!claimedCampaign) {
    throw new Error("INVALID_CAMPAIGN_STATUS");
  }

  const { data: pendingRows, error: pendingRowsError } = await supabase
    .from("campaign_recipients")
    .select("id, contact_id, email")
    .eq("campaign_id", campaignId)
    .eq("status", "pending");
  throwIfError(pendingRowsError);

  const pendingRowsSafe = pendingRows || [];
  const contactIds = unique(pendingRowsSafe.map((row) => row.contact_id));

  const { data: contacts, error: contactsError } =
    contactIds.length > 0
      ? await supabase
          .from("email_contacts")
          .select(
            "id, email, first_name, last_name, phone, company, city, country, language, source",
          )
          .eq("user_id", userId)
          .in("id", contactIds)
      : { data: [], error: null };
  throwIfError(contactsError);

  const contactMap = new Map((contacts || []).map((row) => [row.id, row]));

  let remainingDailyLimit = Math.max(
    0,
    (emailAccount.daily_limit || 0) - (emailAccount.sent_today || 0),
  );
  let successCount = 0;
  let failedCount = 0;
  let paused = false;
  const logs = [];

  for (const row of pendingRowsSafe) {
    if (await isCampaignPaused(userId, campaignId)) {
      paused = true;
      break;
    }

    const contact = contactMap.get(row.contact_id) || {
      id: row.contact_id,
      email: row.email,
    };
    const rendered = renderCampaignEmail(template, contact);

    if (remainingDailyLimit <= 0) {
      await updateCampaignRecipientResult({
        recipientId: row.id,
        status: "failed",
        renderedSubject: rendered.subject,
        renderedHtml: rendered.html,
        errorMessage: "Daily sending limit reached for this email account",
      });

      logs.push({
        user_id: userId,
        campaign_id: campaignId,
        contact_id: row.contact_id,
        email: row.email,
        status: "failed",
        message: "Daily sending limit reached for this email account",
        sent_time: new Date().toISOString(),
      });
      failedCount += 1;
      continue;
    }

    try {
      const sentAt = new Date().toISOString();
      const result = await sendCampaignEmail({
        account: emailAccount,
        template,
        contact,
        recipientId: row.id,
        recipientEmail: row.email,
      });

      await updateCampaignRecipientResult({
        recipientId: row.id,
        status: "sent",
        renderedSubject: result.rendered.subject,
        renderedHtml: result.rendered.html,
        errorMessage: null,
        sentTime: sentAt,
      });

      logs.push({
        user_id: userId,
        campaign_id: campaignId,
        contact_id: row.contact_id,
        email: row.email,
        status: "sent",
        message: result.response || result.messageId || "Campaign sent",
        sent_time: sentAt,
      });

      successCount += 1;
      remainingDailyLimit -= 1;
    } catch (error) {
      const message = error.message || "SMTP send failed";

      await updateCampaignRecipientResult({
        recipientId: row.id,
        status: "failed",
        renderedSubject: rendered.subject,
        renderedHtml: rendered.html,
        errorMessage: message,
      });

      logs.push({
        user_id: userId,
        campaign_id: campaignId,
        contact_id: row.contact_id,
        email: row.email,
        status: "failed",
        message,
        sent_time: new Date().toISOString(),
      });

      failedCount += 1;
    }
  }

  paused = paused || (await isCampaignPaused(userId, campaignId));

  if (logs.length > 0) {
    const { error: logError } = await supabase.from("email_logs").insert(logs);
    throwIfError(logError);
  }

  if (successCount > 0) {
    const { error: accountUpdateError } = await supabase
      .from("email_accounts")
      .update({
        sent_today: (emailAccount.sent_today || 0) + successCount,
        last_used_at: now,
        status: "active",
      })
      .eq("id", emailAccount.id)
      .eq("user_id", userId);
    throwIfError(accountUpdateError);
  }

  const completeDispatch = async (preservePause) => {
    const updates = {
      status: preservePause ? "paused" : "sent",
      sent_count: (campaign.sent_count || 0) + successCount,
      updated_at: new Date().toISOString(),
    };

    if (!preservePause) {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("campaigns")
      .update(updates)
      .eq("id", campaignId)
      .eq("user_id", userId)
      .eq("status", preservePause ? "paused" : "sending")
      .select(
        "id, campaign_name, status, campaign_type, total_recipients, sent_count, open_count, click_count, bounce_count, unsubscribe_count, started_at, completed_at, updated_at",
      )
      .maybeSingle();

    throwIfError(error);
    return data || null;
  };

  let updatedCampaign = await completeDispatch(paused);
  if (!updatedCampaign && !paused) {
    paused = true;
    updatedCampaign = await completeDispatch(true);
  }

  if (!updatedCampaign) {
    throw new Error("INVALID_CAMPAIGN_STATUS");
  }

  return {
    ...updatedCampaign,
    sent_now: successCount,
    failed_now: failedCount,
  };
};

const pauseCampaign = async (userId, campaignId) => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("campaigns")
    .update({
      status: "paused",
      updated_at: now,
    })
    .eq("id", campaignId)
    .eq("user_id", userId)
    .in("status", ["scheduled", "sending"])
    .select("id, campaign_name, status, updated_at")
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const acquireWorkerLock = async (lockKey, ownerId, ttlSeconds) => {
  const nowIso = new Date().toISOString();
  const expiresAtIso = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const { error: cleanupError } = await supabase
    .from("worker_locks")
    .delete()
    .eq("lock_key", lockKey)
    .lt("expires_at", nowIso);
  throwIfError(cleanupError);

  const { data, error } = await supabase
    .from("worker_locks")
    .insert({
      lock_key: lockKey,
      owner_id: ownerId,
      expires_at: expiresAtIso,
      updated_at: nowIso,
    })
    .select("lock_key")
    .maybeSingle();

  if (error) {
    if (error.message && error.message.includes("duplicate key value")) {
      return false;
    }
    throw new Error(error.message);
  }

  return !!data;
};

const releaseWorkerLock = async (lockKey, ownerId) => {
  const { error } = await supabase
    .from("worker_locks")
    .delete()
    .eq("lock_key", lockKey)
    .eq("owner_id", ownerId);
  throwIfError(error);
};

const listDueScheduledCampaigns = async (limit) => {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("campaigns")
    .select("id, user_id, scheduled_time")
    .eq("status", "scheduled")
    .lte("scheduled_time", nowIso)
    .order("scheduled_time", { ascending: true })
    .limit(limit);

  throwIfError(error);
  return data || [];
};

const enqueueCampaignDispatch = async ({ userId, campaignId, source }) => {
  const nowIso = new Date().toISOString();

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .update({
      status: "queued",
      updated_at: nowIso,
    })
    .eq("id", campaignId)
    .eq("user_id", userId)
    .eq("status", "scheduled")
    .lte("scheduled_time", nowIso)
    .select("id, user_id")
    .maybeSingle();

  throwIfError(campaignError);

  if (!campaign) {
    return { enqueued: false, reason: "NOT_DUE_OR_ALREADY_QUEUED" };
  }

  const { data: queueRow, error: queueError } = await supabase
    .from("campaign_dispatch_queue")
    .upsert(
      {
        campaign_id: campaignId,
        user_id: userId,
        source: source || "scheduled",
        status: "pending",
        available_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "campaign_id" },
    )
    .select("id, campaign_id, user_id, status, source, available_at")
    .maybeSingle();

  throwIfError(queueError);

  return {
    enqueued: true,
    queueItem: queueRow,
  };
};

const listPendingDispatchQueue = async (limit) => {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("campaign_dispatch_queue")
    .select("id, campaign_id, user_id, attempts")
    .eq("status", "pending")
    .lte("available_at", nowIso)
    .order("created_at", { ascending: true })
    .limit(limit);

  throwIfError(error);
  return data || [];
};

const claimDispatchQueueItem = async (queueId, workerId) => {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("campaign_dispatch_queue")
    .update({
      status: "processing",
      locked_by: workerId,
      locked_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", queueId)
    .eq("status", "pending")
    .select("id, campaign_id, user_id, attempts")
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const markDispatchQueueCompleted = async (queueId) => {
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from("campaign_dispatch_queue")
    .update({
      status: "completed",
      completed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", queueId);

  throwIfError(error);
};

const markDispatchQueueFailed = async (queueId, errorMessage) => {
  const nowIso = new Date().toISOString();

  const { data: current, error: currentError } = await supabase
    .from("campaign_dispatch_queue")
    .select("attempts")
    .eq("id", queueId)
    .maybeSingle();
  throwIfError(currentError);

  const attempts = (current?.attempts || 0) + 1;

  const { error } = await supabase
    .from("campaign_dispatch_queue")
    .update({
      status: "failed",
      attempts,
      last_error: errorMessage || "Unknown dispatch error",
      updated_at: nowIso,
    })
    .eq("id", queueId);

  throwIfError(error);
};

module.exports = {
  listCampaigns,
  findCampaignById,
  listCampaignRecipients,
  findCampaignRecipientById,
  createCampaign,
  updateCampaign,
  startCampaign,
  pauseCampaign,
  acquireWorkerLock,
  releaseWorkerLock,
  listDueScheduledCampaigns,
  enqueueCampaignDispatch,
  listPendingDispatchQueue,
  claimDispatchQueueItem,
  markDispatchQueueCompleted,
  markDispatchQueueFailed,
};
