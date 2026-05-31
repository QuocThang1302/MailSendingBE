const { supabase } = require("../../config/supabase");

const throwIfError = (error) => {
  if (error) {
    throw new Error(error.message);
  }
};

const findRecipientContext = async (recipientId) => {
  const { data: recipient, error: recipientError } = await supabase
    .from("campaign_recipients")
    .select(
      "id, campaign_id, contact_id, email, status, open_time, click_time, open_count, click_count",
    )
    .eq("id", recipientId)
    .maybeSingle();
  throwIfError(recipientError);

  if (!recipient) {
    return null;
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, user_id, open_count, click_count, unsubscribe_count")
    .eq("id", recipient.campaign_id)
    .maybeSingle();
  throwIfError(campaignError);

  return campaign ? { recipient, campaign } : null;
};

const insertTrackingEvent = async (recipientId, eventType, metadata) => {
  const { error } = await supabase.from("email_tracking").insert({
    campaign_recipient_id: recipientId,
    event_type: eventType,
    clicked_url: metadata.clickedUrl || null,
    ip_address: metadata.ipAddress || null,
    user_agent: metadata.userAgent || null,
  });
  throwIfError(error);
};

const findIndividualEmailContext = async (individualEmailId) => {
  const { data, error } = await supabase
    .from("individual_emails")
    .select(
      "id, user_id, contact_id, email, status, open_time, click_time, open_count, click_count",
    )
    .eq("id", individualEmailId)
    .maybeSingle();
  throwIfError(error);
  return data || null;
};

const insertIndividualTrackingEvent = async (
  individualEmailId,
  eventType,
  metadata,
) => {
  const { error } = await supabase.from("email_tracking").insert({
    individual_email_id: individualEmailId,
    event_type: eventType,
    clicked_url: metadata.clickedUrl || null,
    ip_address: metadata.ipAddress || null,
    user_agent: metadata.userAgent || null,
  });
  throwIfError(error);
};

const recordOpen = async (recipientId, metadata) => {
  const context = await findRecipientContext(recipientId);
  if (!context) {
    return false;
  }

  const { recipient, campaign } = context;
  await insertTrackingEvent(recipientId, "open", metadata);

  const firstOpen = !recipient.open_time;
  const recipientUpdates = {
    open_count: Number(recipient.open_count || 0) + 1,
  };
  if (firstOpen) {
    recipientUpdates.open_time = new Date().toISOString();
  }

  const { error: recipientError } = await supabase
    .from("campaign_recipients")
    .update(recipientUpdates)
    .eq("id", recipientId);
  throwIfError(recipientError);

  if (firstOpen) {
    const { error: campaignError } = await supabase
      .from("campaigns")
      .update({ open_count: Number(campaign.open_count || 0) + 1 })
      .eq("id", campaign.id);
    throwIfError(campaignError);
  }

  return true;
};

const recordClick = async (recipientId, clickedUrl, metadata) => {
  const context = await findRecipientContext(recipientId);
  if (!context) {
    return false;
  }

  const { recipient, campaign } = context;
  await insertTrackingEvent(recipientId, "click", {
    ...metadata,
    clickedUrl,
  });

  const firstClick = !recipient.click_time;
  const recipientUpdates = {
    click_count: Number(recipient.click_count || 0) + 1,
  };
  if (firstClick) {
    recipientUpdates.click_time = new Date().toISOString();
  }

  const { error: recipientError } = await supabase
    .from("campaign_recipients")
    .update(recipientUpdates)
    .eq("id", recipientId);
  throwIfError(recipientError);

  if (firstClick) {
    const { error: campaignError } = await supabase
      .from("campaigns")
      .update({ click_count: Number(campaign.click_count || 0) + 1 })
      .eq("id", campaign.id);
    throwIfError(campaignError);
  }

  return true;
};

const unsubscribe = async (recipientId, metadata) => {
  const context = await findRecipientContext(recipientId);
  if (!context) {
    return false;
  }

  const { recipient, campaign } = context;
  const normalizedEmail = String(recipient.email || "").trim().toLowerCase();
  const firstUnsubscribe = recipient.status !== "unsubscribed";

  const { error: unsubscribeError } = await supabase.from("unsubscribes").upsert(
    {
      user_id: campaign.user_id,
      contact_id: recipient.contact_id || null,
      email: normalizedEmail,
      reason: "user_request",
      campaign_id: campaign.id,
      ip_address: metadata.ipAddress || null,
      unsubscribed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,email" },
  );
  throwIfError(unsubscribeError);

  if (recipient.contact_id) {
    const { error: contactError } = await supabase
      .from("email_contacts")
      .update({ email_status: "unsubscribed", updated_at: new Date().toISOString() })
      .eq("id", recipient.contact_id)
      .eq("user_id", campaign.user_id);
    throwIfError(contactError);
  }

  const { error: recipientError } = await supabase
    .from("campaign_recipients")
    .update({ status: "unsubscribed" })
    .eq("id", recipient.id);
  throwIfError(recipientError);

  if (firstUnsubscribe) {
    await insertTrackingEvent(recipientId, "unsubscribe", metadata);

    const { error: campaignError } = await supabase
      .from("campaigns")
      .update({
        unsubscribe_count: Number(campaign.unsubscribe_count || 0) + 1,
      })
      .eq("id", campaign.id);
    throwIfError(campaignError);
  }

  return true;
};

const recordIndividualOpen = async (individualEmailId, metadata) => {
  const email = await findIndividualEmailContext(individualEmailId);
  if (!email) {
    return false;
  }

  await insertIndividualTrackingEvent(individualEmailId, "open", metadata);

  const updates = {
    open_count: Number(email.open_count || 0) + 1,
  };
  if (!email.open_time) {
    updates.open_time = new Date().toISOString();
  }

  const { error } = await supabase
    .from("individual_emails")
    .update(updates)
    .eq("id", individualEmailId);
  throwIfError(error);
  return true;
};

const recordIndividualClick = async (individualEmailId, clickedUrl, metadata) => {
  const email = await findIndividualEmailContext(individualEmailId);
  if (!email) {
    return false;
  }

  await insertIndividualTrackingEvent(individualEmailId, "click", {
    ...metadata,
    clickedUrl,
  });

  const updates = {
    click_count: Number(email.click_count || 0) + 1,
  };
  if (!email.click_time) {
    updates.click_time = new Date().toISOString();
  }

  const { error } = await supabase
    .from("individual_emails")
    .update(updates)
    .eq("id", individualEmailId);
  throwIfError(error);
  return true;
};

const unsubscribeIndividual = async (individualEmailId, metadata) => {
  const email = await findIndividualEmailContext(individualEmailId);
  if (!email) {
    return false;
  }

  const firstUnsubscribe = email.status !== "unsubscribed";
  const normalizedEmail = String(email.email || "").trim().toLowerCase();
  const { error: unsubscribeError } = await supabase.from("unsubscribes").upsert(
    {
      user_id: email.user_id,
      contact_id: email.contact_id || null,
      email: normalizedEmail,
      reason: "user_request",
      campaign_id: null,
      ip_address: metadata.ipAddress || null,
      unsubscribed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,email" },
  );
  throwIfError(unsubscribeError);

  if (email.contact_id) {
    const { error: contactError } = await supabase
      .from("email_contacts")
      .update({ email_status: "unsubscribed", updated_at: new Date().toISOString() })
      .eq("id", email.contact_id)
      .eq("user_id", email.user_id);
    throwIfError(contactError);
  }

  const { error: emailError } = await supabase
    .from("individual_emails")
    .update({ status: "unsubscribed" })
    .eq("id", individualEmailId);
  throwIfError(emailError);

  if (firstUnsubscribe) {
    await insertIndividualTrackingEvent(
      individualEmailId,
      "unsubscribe",
      metadata,
    );
  }

  return true;
};

module.exports = {
  findRecipientContext,
  findIndividualEmailContext,
  recordOpen,
  recordClick,
  unsubscribe,
  recordIndividualOpen,
  recordIndividualClick,
  unsubscribeIndividual,
};
