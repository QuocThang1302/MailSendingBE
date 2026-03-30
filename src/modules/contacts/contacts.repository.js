const { supabase } = require("../../config/supabase");

const CONTACT_COLUMNS =
  "id, email, first_name, last_name, phone, company, city, country, language, email_status, source, created_at, updated_at";

const throwIfError = (error) => {
  if (error) {
    throw new Error(error.message);
  }
};

const chunkArray = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const mapContactPayloadToRow = (userId, payload) => ({
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
  source: payload.source || "import",
});

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

const findContactsByEmails = async (userId, emails) => {
  if (!Array.isArray(emails) || emails.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("email_contacts")
    .select("id, email")
    .eq("user_id", userId)
    .in("email", emails);

  throwIfError(error);
  return data || [];
};

const listContactsForExport = async (userId, { search, status, city }) => {
  let builder = supabase
    .from("email_contacts")
    .select(CONTACT_COLUMNS)
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

  const { data, error } = await builder.order("created_at", {
    ascending: false,
  });
  throwIfError(error);
  return data || [];
};

const bulkInsertContacts = async (userId, payloads) => {
  const emails = payloads.map((item) => item.email);
  const existingRows = await findContactsByEmails(userId, emails);
  const existingEmailSet = new Set(
    existingRows.map((item) => String(item.email).toLowerCase()),
  );

  const rowsToInsert = payloads
    .filter((item) => !existingEmailSet.has(item.email))
    .map((item) => mapContactPayloadToRow(userId, item));

  const chunks = chunkArray(rowsToInsert, 500);
  for (const rows of chunks) {
    if (rows.length === 0) {
      continue;
    }

    const { error } = await supabase.from("email_contacts").insert(rows);
    throwIfError(error);
  }

  return {
    inserted: rowsToInsert.length,
    updated: 0,
    skippedDuplicates: payloads.length - rowsToInsert.length,
  };
};

const bulkUpsertContacts = async (userId, payloads) => {
  const emails = payloads.map((item) => item.email);
  const existingRows = await findContactsByEmails(userId, emails);
  const existingByEmail = new Map(
    existingRows.map((item) => [String(item.email).toLowerCase(), item.id]),
  );

  const toInsert = [];
  const toUpdate = [];

  for (const payload of payloads) {
    const existingId = existingByEmail.get(payload.email);
    if (existingId) {
      toUpdate.push({ id: existingId, payload });
    } else {
      toInsert.push(mapContactPayloadToRow(userId, payload));
    }
  }

  for (const item of toUpdate) {
    const updates = mapContactPayloadToRow(userId, item.payload);
    delete updates.user_id;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("email_contacts")
      .update(updates)
      .eq("id", item.id)
      .eq("user_id", userId);
    throwIfError(error);
  }

  const insertChunks = chunkArray(toInsert, 500);
  for (const rows of insertChunks) {
    if (rows.length === 0) {
      continue;
    }

    const { error } = await supabase.from("email_contacts").insert(rows);
    throwIfError(error);
  }

  return {
    inserted: toInsert.length,
    updated: toUpdate.length,
    skippedDuplicates: 0,
  };
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

const listDynamicFields = async (userId) => {
  const { data, error } = await supabase
    .from("dynamic_fields")
    .select("id, field_name, field_label, field_type, is_required, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  throwIfError(error);
  return data || [];
};

const createDynamicField = async (userId, payload) => {
  const { data, error } = await supabase
    .from("dynamic_fields")
    .insert({
      user_id: userId,
      field_name: payload.fieldName,
      field_label: payload.fieldLabel || null,
      field_type: payload.fieldType || "text",
      is_required: payload.isRequired || false,
    })
    .select("id, field_name, field_label, field_type, is_required, created_at")
    .maybeSingle();

  throwIfError(error);
  return data;
};

const updateDynamicField = async (userId, fieldId, payload) => {
  const updates = {};

  if (payload.fieldName !== undefined) {
    updates.field_name = payload.fieldName;
  }
  if (payload.fieldLabel !== undefined) {
    updates.field_label = payload.fieldLabel;
  }
  if (payload.fieldType !== undefined) {
    updates.field_type = payload.fieldType;
  }
  if (payload.isRequired !== undefined) {
    updates.is_required = payload.isRequired;
  }

  const { data, error } = await supabase
    .from("dynamic_fields")
    .update(updates)
    .eq("id", fieldId)
    .eq("user_id", userId)
    .select("id, field_name, field_label, field_type, is_required, created_at")
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const deleteDynamicField = async (userId, fieldId) => {
  const { data, error } = await supabase
    .from("dynamic_fields")
    .delete()
    .eq("id", fieldId)
    .eq("user_id", userId)
    .select("id");

  throwIfError(error);
  return Array.isArray(data) && data.length > 0;
};

const listContactFieldValues = async (userId, contactId) => {
  const contact = await findContactById(userId, contactId);
  if (!contact) {
    return null;
  }

  const { data: fields, error: fieldsError } = await supabase
    .from("dynamic_fields")
    .select("id, field_name, field_label, field_type, is_required")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  throwIfError(fieldsError);

  const fieldIds = (fields || []).map((item) => item.id);
  if (fieldIds.length === 0) {
    return [];
  }

  const { data: values, error: valuesError } = await supabase
    .from("contact_field_values")
    .select("field_id, value")
    .eq("contact_id", contactId)
    .in("field_id", fieldIds);
  throwIfError(valuesError);

  const valueMap = new Map(
    (values || []).map((item) => [item.field_id, item.value]),
  );

  return fields.map((field) => ({
    fieldId: field.id,
    fieldName: field.field_name,
    fieldLabel: field.field_label,
    fieldType: field.field_type,
    isRequired: field.is_required,
    value: valueMap.has(field.id) ? valueMap.get(field.id) : null,
  }));
};

const replaceContactFieldValues = async (userId, contactId, values) => {
  const contact = await findContactById(userId, contactId);
  if (!contact) {
    return null;
  }

  const fieldIds = [...new Set(values.map((item) => item.fieldId))];
  const { data: ownedFields, error: ownedFieldsError } = await supabase
    .from("dynamic_fields")
    .select("id")
    .eq("user_id", userId)
    .in("id", fieldIds);
  throwIfError(ownedFieldsError);

  const ownedFieldIdSet = new Set((ownedFields || []).map((item) => item.id));
  const normalizedRows = values
    .filter((item) => ownedFieldIdSet.has(item.fieldId))
    .map((item) => ({
      contact_id: contactId,
      field_id: item.fieldId,
      value: item.value === null ? null : String(item.value),
    }));

  const { error: deleteError } = await supabase
    .from("contact_field_values")
    .delete()
    .eq("contact_id", contactId);
  throwIfError(deleteError);

  if (normalizedRows.length > 0) {
    const { error: insertError } = await supabase
      .from("contact_field_values")
      .upsert(normalizedRows, { onConflict: "contact_id,field_id" });
    throwIfError(insertError);
  }

  return listContactFieldValues(userId, contactId);
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
  listContactsForExport,
  findContactById,
  findContactsByEmails,
  createContact,
  bulkInsertContacts,
  bulkUpsertContacts,
  updateContact,
  deleteContact,
  listTags,
  createTag,
  listDynamicFields,
  createDynamicField,
  updateDynamicField,
  deleteDynamicField,
  getContactTags,
  replaceContactTags,
  listContactFieldValues,
  replaceContactFieldValues,
};
