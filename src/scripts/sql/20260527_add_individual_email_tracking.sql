-- Store sent individual-email snapshots and connect them to tracking events.

ALTER TABLE individual_emails
  ADD COLUMN IF NOT EXISTS email VARCHAR(150),
  ADD COLUMN IF NOT EXISTS click_time TIMESTAMP,
  ADD COLUMN IF NOT EXISTS open_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count INT DEFAULT 0;

ALTER TABLE email_tracking
  ADD COLUMN IF NOT EXISTS individual_email_id INT REFERENCES individual_emails(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_individual_emails_user_sent
  ON individual_emails(user_id, sent_time);

CREATE INDEX IF NOT EXISTS idx_tracking_individual_email
  ON email_tracking(individual_email_id);
