-- Add backend support tables for drag-drop template designer
-- Run this in your Supabase SQL editor before using designer endpoints.

CREATE TABLE IF NOT EXISTS template_layouts (
  id SERIAL PRIMARY KEY,
  template_id INT NOT NULL UNIQUE REFERENCES email_templates(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  layout_json JSONB NOT NULL DEFAULT '{"schemaVersion":1,"blocks":[]}'::jsonb,
  editor_state JSONB,
  rendered_html TEXT,
  rendered_text TEXT,
  draft_version INT DEFAULT 0,
  last_published_version INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_template_layouts_user_id ON template_layouts(user_id);

CREATE TABLE IF NOT EXISTS template_layout_versions (
  id SERIAL PRIMARY KEY,
  template_id INT NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  layout_json JSONB NOT NULL,
  editor_state JSONB,
  rendered_html TEXT,
  rendered_text TEXT,
  note VARCHAR(255),
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(template_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_template_layout_versions_template_id
  ON template_layout_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_layout_versions_user_id
  ON template_layout_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_template_layout_versions_published
  ON template_layout_versions(template_id, is_published);
