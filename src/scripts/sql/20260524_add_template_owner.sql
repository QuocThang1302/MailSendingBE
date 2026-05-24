-- Template owner support.
-- Current schema stores the template owner in email_templates.user_id.
-- Backend responses expose this as created_by_user_id for FE compatibility.

CREATE INDEX IF NOT EXISTS idx_email_templates_user_id
ON email_templates(user_id);
