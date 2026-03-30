const { supabase } = require("../../config/supabase");
const { renderTemplateLayout } = require("./templateRenderer");

const LIST_COLUMNS =
  "id, template_name, subject, preview_text, version, is_active, created_at, updated_at";
const DETAIL_COLUMNS =
  "id, template_name, subject, preview_text, content_html, content_text, version, is_active, created_at, updated_at";

const throwIfError = (error) => {
  if (error) {
    throw new Error(error.message);
  }
};

const ensureTemplateOwnership = async (userId, templateId) => {
  const { data, error } = await supabase
    .from("email_templates")
    .select("id, version")
    .eq("id", templateId)
    .eq("user_id", userId)
    .maybeSingle();

  throwIfError(error);
  return data || null;
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

const getTemplateDesigner = async (userId, templateId) => {
  const template = await ensureTemplateOwnership(userId, templateId);
  if (!template) {
    return null;
  }

  const { data, error } = await supabase
    .from("template_layouts")
    .select(
      "template_id, layout_json, editor_state, rendered_html, rendered_text, draft_version, last_published_version, updated_at",
    )
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .maybeSingle();

  throwIfError(error);

  if (!data) {
    return {
      templateId,
      layout: {
        schemaVersion: 1,
        blocks: [],
      },
      editorState: null,
      renderedHtml: null,
      renderedText: null,
      draftVersion: 0,
      lastPublishedVersion: null,
      updatedAt: null,
    };
  }

  return {
    templateId: data.template_id,
    layout: data.layout_json,
    editorState: data.editor_state,
    renderedHtml: data.rendered_html,
    renderedText: data.rendered_text,
    draftVersion: data.draft_version,
    lastPublishedVersion: data.last_published_version,
    updatedAt: data.updated_at,
  };
};

const saveTemplateDesigner = async (userId, templateId, payload) => {
  const template = await ensureTemplateOwnership(userId, templateId);
  if (!template) {
    return null;
  }

  let renderedHtml = payload.renderedHtml;
  let renderedText = payload.renderedText;

  if (renderedHtml === undefined || renderedText === undefined) {
    const rendered = renderTemplateLayout(payload.layout);
    if (renderedHtml === undefined) {
      renderedHtml = rendered.html;
    }
    if (renderedText === undefined) {
      renderedText = rendered.text;
    }
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("template_layouts")
    .upsert(
      {
        template_id: templateId,
        user_id: userId,
        layout_json: payload.layout,
        editor_state: payload.editorState || null,
        rendered_html: renderedHtml || null,
        rendered_text: renderedText || null,
        updated_at: now,
      },
      { onConflict: "template_id" },
    )
    .select(
      "template_id, layout_json, editor_state, rendered_html, rendered_text, draft_version, last_published_version, updated_at",
    )
    .maybeSingle();

  throwIfError(error);

  return {
    templateId: data.template_id,
    layout: data.layout_json,
    editorState: data.editor_state,
    renderedHtml: data.rendered_html,
    renderedText: data.rendered_text,
    draftVersion: data.draft_version,
    lastPublishedVersion: data.last_published_version,
    updatedAt: data.updated_at,
  };
};

const publishTemplateDesigner = async (userId, templateId, payload) => {
  const template = await ensureTemplateOwnership(userId, templateId);
  if (!template) {
    return null;
  }

  let layout = payload.layout || null;
  let editorState = payload.editorState || null;
  let renderedHtml = payload.renderedHtml;
  let renderedText = payload.renderedText;

  const { data: draft, error: draftError } = await supabase
    .from("template_layouts")
    .select(
      "template_id, layout_json, editor_state, rendered_html, rendered_text, draft_version, last_published_version",
    )
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .maybeSingle();
  throwIfError(draftError);

  if (!layout) {
    layout = draft?.layout_json || null;
  }
  if (!editorState) {
    editorState = draft?.editor_state || null;
  }
  if (renderedHtml === undefined) {
    renderedHtml = draft?.rendered_html || null;
  }
  if (renderedText === undefined) {
    renderedText = draft?.rendered_text || null;
  }

  if (!layout) {
    throw new Error("DESIGNER_LAYOUT_REQUIRED");
  }

  if (
    renderedHtml === null ||
    renderedHtml === undefined ||
    renderedText === null ||
    renderedText === undefined
  ) {
    const rendered = renderTemplateLayout(layout);
    if (renderedHtml === null || renderedHtml === undefined) {
      renderedHtml = rendered.html;
    }
    if (renderedText === null || renderedText === undefined) {
      renderedText = rendered.text;
    }
  }

  const { data: maxVersionRow, error: maxVersionError } = await supabase
    .from("template_layout_versions")
    .select("version_number")
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(maxVersionError);

  const nextVersion = (maxVersionRow?.version_number || 0) + 1;
  const now = new Date().toISOString();

  const { error: unpublishError } = await supabase
    .from("template_layout_versions")
    .update({ is_published: false })
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .eq("is_published", true);
  throwIfError(unpublishError);

  const { data: versionData, error: insertVersionError } = await supabase
    .from("template_layout_versions")
    .insert({
      template_id: templateId,
      user_id: userId,
      version_number: nextVersion,
      layout_json: layout,
      editor_state: editorState,
      rendered_html: renderedHtml || null,
      rendered_text: renderedText || null,
      note: payload.note || null,
      is_published: true,
    })
    .select(
      "id, template_id, version_number, layout_json, editor_state, rendered_html, rendered_text, note, is_published, created_at",
    )
    .maybeSingle();
  throwIfError(insertVersionError);

  const { error: upsertDraftError } = await supabase
    .from("template_layouts")
    .upsert(
      {
        template_id: templateId,
        user_id: userId,
        layout_json: layout,
        editor_state: editorState,
        rendered_html: renderedHtml || null,
        rendered_text: renderedText || null,
        draft_version: nextVersion,
        last_published_version: nextVersion,
        updated_at: now,
      },
      { onConflict: "template_id" },
    );
  throwIfError(upsertDraftError);

  const templateUpdates = {
    version: nextVersion,
    updated_at: now,
  };
  if (renderedHtml !== undefined) {
    templateUpdates.content_html = renderedHtml || null;
  }
  if (renderedText !== undefined) {
    templateUpdates.content_text = renderedText || null;
  }

  const { error: updateTemplateError } = await supabase
    .from("email_templates")
    .update(templateUpdates)
    .eq("id", templateId)
    .eq("user_id", userId);
  throwIfError(updateTemplateError);

  return {
    versionId: versionData.id,
    templateId: versionData.template_id,
    versionNumber: versionData.version_number,
    layout: versionData.layout_json,
    editorState: versionData.editor_state,
    renderedHtml: versionData.rendered_html,
    renderedText: versionData.rendered_text,
    note: versionData.note,
    isPublished: versionData.is_published,
    createdAt: versionData.created_at,
  };
};

const listTemplateDesignerVersions = async (userId, templateId, pagination) => {
  const template = await ensureTemplateOwnership(userId, templateId);
  if (!template) {
    return null;
  }

  const page = pagination.page;
  const pageSize = pagination.pageSize;
  const offset = (page - 1) * pageSize;

  const { data, count, error } = await supabase
    .from("template_layout_versions")
    .select("id, template_id, version_number, note, is_published, created_at", {
      count: "exact",
    })
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .order("version_number", { ascending: false })
    .range(offset, offset + pageSize - 1);
  throwIfError(error);

  return {
    total: count || 0,
    rows:
      data?.map((item) => ({
        id: item.id,
        templateId: item.template_id,
        versionNumber: item.version_number,
        note: item.note,
        isPublished: item.is_published,
        createdAt: item.created_at,
      })) || [],
  };
};

const getTemplateDesignerVersion = async (userId, templateId, versionId) => {
  const template = await ensureTemplateOwnership(userId, templateId);
  if (!template) {
    return null;
  }

  const { data, error } = await supabase
    .from("template_layout_versions")
    .select(
      "id, template_id, version_number, layout_json, editor_state, rendered_html, rendered_text, note, is_published, created_at",
    )
    .eq("id", versionId)
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .maybeSingle();
  throwIfError(error);

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    templateId: data.template_id,
    versionNumber: data.version_number,
    layout: data.layout_json,
    editorState: data.editor_state,
    renderedHtml: data.rendered_html,
    renderedText: data.rendered_text,
    note: data.note,
    isPublished: data.is_published,
    createdAt: data.created_at,
  };
};

const restoreTemplateDesignerVersion = async (
  userId,
  templateId,
  versionId,
) => {
  const version = await getTemplateDesignerVersion(
    userId,
    templateId,
    versionId,
  );
  if (!version) {
    return null;
  }

  const now = new Date().toISOString();

  const { error: upsertDraftError } = await supabase
    .from("template_layouts")
    .upsert(
      {
        template_id: templateId,
        user_id: userId,
        layout_json: version.layout,
        editor_state: version.editorState,
        rendered_html: version.renderedHtml,
        rendered_text: version.renderedText,
        draft_version: version.versionNumber,
        updated_at: now,
      },
      { onConflict: "template_id" },
    );
  throwIfError(upsertDraftError);

  const { error: templateUpdateError } = await supabase
    .from("email_templates")
    .update({
      content_html: version.renderedHtml || null,
      content_text: version.renderedText || null,
      version: version.versionNumber,
      updated_at: now,
    })
    .eq("id", templateId)
    .eq("user_id", userId);
  throwIfError(templateUpdateError);

  return {
    restored: true,
    templateId,
    versionId: version.id,
    versionNumber: version.versionNumber,
  };
};

module.exports = {
  listTemplates,
  findTemplateById,
  createTemplate,
  updateTemplate,
  getTemplateDesigner,
  saveTemplateDesigner,
  publishTemplateDesigner,
  listTemplateDesignerVersions,
  getTemplateDesignerVersion,
  restoreTemplateDesignerVersion,
  deleteTemplate,
};
