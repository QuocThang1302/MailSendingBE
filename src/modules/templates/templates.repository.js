const { supabase } = require("../../config/supabase");

const LIST_COLUMNS =
  "id, template_name, subject, preview_text, version, is_active, created_at, updated_at";
const DETAIL_COLUMNS =
  "id, template_name, subject, preview_text, content_html, content_text, version, is_active, created_at, updated_at";

const throwIfError = (error) => {
  if (error) {
    throw new Error(error.message);
  }
};

const listTemplates = async (userId, { page, pageSize, isActive }) => {
  const offset = (page - 1) * pageSize;

  let builder = supabase
    .from("email_templates")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("user_id", userId);

  if (isActive !== undefined) {
    builder = builder.eq("is_active", isActive);
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

const findTemplateById = async (userId, templateId) => {
  const { data, error } = await supabase
    .from("email_templates")
    .select(DETAIL_COLUMNS)
    .eq("id", templateId)
    .eq("user_id", userId)
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const createTemplate = async (userId, payload) => {
  const { data, error } = await supabase
    .from("email_templates")
    .insert({
      user_id: userId,
      template_name: payload.templateName,
      subject: payload.subject || null,
      preview_text: payload.previewText || null,
      content_html: payload.contentHtml || null,
      content_text: payload.contentText || null,
      version: 1,
      is_active: payload.isActive ?? true,
    })
    .select(DETAIL_COLUMNS)
    .maybeSingle();

  throwIfError(error);
  return data;
};

const updateTemplate = async (userId, templateId, payload) => {
  const fields = {
    template_name: payload.templateName,
    subject: payload.subject,
    preview_text: payload.previewText,
    content_html: payload.contentHtml,
    content_text: payload.contentText,
    is_active: payload.isActive,
  };

  const entries = Object.entries(fields).filter(
    ([, value]) => value !== undefined,
  );
  if (entries.length === 0) {
    return findTemplateById(userId, templateId);
  }

  const updates = Object.fromEntries(entries);

  // Increase template version whenever business content changes.
  const shouldIncreaseVersion = [
    "template_name",
    "subject",
    "preview_text",
    "content_html",
    "content_text",
  ].some((column) => entries.some(([changed]) => changed === column));

  if (shouldIncreaseVersion) {
    const { data: current, error: currentError } = await supabase
      .from("email_templates")
      .select("id, version")
      .eq("id", templateId)
      .eq("user_id", userId)
      .maybeSingle();
    throwIfError(currentError);

    if (!current) {
      return null;
    }

    updates.version = (current.version || 0) + 1;
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("email_templates")
    .update(updates)
    .eq("id", templateId)
    .eq("user_id", userId)
    .select(DETAIL_COLUMNS)
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const deleteTemplate = async (userId, templateId) => {
  const { data, error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", userId)
    .select("id");

  throwIfError(error);
  return Array.isArray(data) && data.length > 0;
};

module.exports = {
  listTemplates,
  findTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
