const { supabase } = require("../../config/supabase");

const CONTACT_COLUMNS =
  "id, email, first_name, last_name, phone, company, city, country, language, email_status, source, created_at, updated_at";

const throwIfError = (error) => {
  if (error) {
    throw new Error(error.message);
  }
};

const listContacts = async (
  userId,
  { search, status, city, page, pageSize },
) => {
  const offset = (page - 1) * pageSize;

  let builder = supabase
    .from("email_contacts")
    .select(CONTACT_COLUMNS, { count: "exact" })
    .eq("user_id", userId);

  if (status) {
    builder = builder.eq("email_status", status);
  }

  if (city) {
    builder = builder.ilike("city", city);
  }

  if (search) {
    const keyword = `%${search}%`;
    builder = builder.or(
      `email.ilike.${keyword},first_name.ilike.${keyword},last_name.ilike.${keyword},company.ilike.${keyword}`,
    );
  }

  const { data, count, error } = await builder
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  throwIfError(error);

  return {
    total: count || 0,
    rows: data || [],
  };
};

const findContactById = async (userId, contactId) => {
  const { data, error } = await supabase
    .from("email_contacts")
    .select(CONTACT_COLUMNS)
    .eq("id", contactId)
    .eq("user_id", userId)
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const createContact = async (userId, payload) => {
  const { data, error } = await supabase
    .from("email_contacts")
    .insert({
      user_id: userId,
      email: payload.email,
      first_name: payload.firstName || null,
      last_name: payload.lastName || null,
      phone: payload.phone || null,
      company: payload.company || null,
      city: payload.city || null,
      country: payload.country || null,
      language: payload.language || "vi",
      email_status: payload.emailStatus || "active",
      source: payload.source || "manual",
    })
    .select(CONTACT_COLUMNS)
    .maybeSingle();

  throwIfError(error);
  return data;
};

const updateContact = async (userId, contactId, payload) => {
  const fields = {
    email: payload.email,
    first_name: payload.firstName,
    last_name: payload.lastName,
    phone: payload.phone,
    company: payload.company,
    city: payload.city,
    country: payload.country,
    language: payload.language,
    email_status: payload.emailStatus,
    source: payload.source,
  };

  const entries = Object.entries(fields).filter(
    ([, value]) => value !== undefined,
  );
  if (entries.length === 0) {
    return findContactById(userId, contactId);
  }

  const updates = Object.fromEntries(entries);
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("email_contacts")
    .update(updates)
    .eq("id", contactId)
    .eq("user_id", userId)
    .select(CONTACT_COLUMNS)
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const deleteContact = async (userId, contactId) => {
  const { data, error } = await supabase
    .from("email_contacts")
    .delete()
    .eq("id", contactId)
    .eq("user_id", userId)
    .select("id");

  throwIfError(error);
  return Array.isArray(data) && data.length > 0;
};

const listTags = async (userId) => {
  const { data, error } = await supabase
    .from("contact_tags")
    .select("id, tag_name, color, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  throwIfError(error);
  return data || [];
};

const createTag = async (userId, { tagName, color }) => {
  const { data, error } = await supabase
    .from("contact_tags")
    .insert({
      user_id: userId,
      tag_name: tagName,
      color: color || "#888888",
    })
    .select("id, tag_name, color, created_at")
    .maybeSingle();

  throwIfError(error);
  return data;
};

const getContactTags = async (contactId) => {
  const { data: mappings, error: mapError } = await supabase
    .from("contact_tag_map")
    .select("tag_id")
    .eq("contact_id", contactId);

  throwIfError(mapError);

  const tagIds = (mappings || []).map((row) => row.tag_id);
  if (tagIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("contact_tags")
    .select("id, tag_name, color")
    .in("id", tagIds)
    .order("tag_name", { ascending: true });

  throwIfError(error);
  return data || [];
};

const replaceContactTags = async (userId, contactId, tagIds) => {
  const contact = await findContactById(userId, contactId);
  if (!contact) {
    return null;
  }

  const { error: deleteError } = await supabase
    .from("contact_tag_map")
    .delete()
    .eq("contact_id", contactId);
  throwIfError(deleteError);

  if (tagIds.length > 0) {
    const { data: ownedTags, error: ownedTagsError } = await supabase
      .from("contact_tags")
      .select("id")
      .eq("user_id", userId)
      .in("id", tagIds);
    throwIfError(ownedTagsError);

    const validTagIds = (ownedTags || []).map((row) => row.id);
    if (validTagIds.length > 0) {
      const rows = validTagIds.map((tagId) => ({
        contact_id: contactId,
        tag_id: tagId,
      }));

      const { error: insertError } = await supabase
        .from("contact_tag_map")
        .upsert(rows, { onConflict: "contact_id,tag_id" });
      throwIfError(insertError);
    }
  }

  return getContactTags(contactId);
};

module.exports = {
  listContacts,
  findContactById,
  createContact,
  updateContact,
  deleteContact,
  listTags,
  createTag,
  getContactTags,
  replaceContactTags,
};
