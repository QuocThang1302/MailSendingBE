-- Store short-lived OTP codes for registration, password-change, and email-change confirmation.

CREATE TABLE IF NOT EXISTS auth_otp_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(150) NOT NULL,
  purpose VARCHAR(40) NOT NULL CHECK (purpose IN ('register', 'password_change', 'email_change')),
  code_hash TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP,
  attempt_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_otp_lookup
  ON auth_otp_codes(email, purpose, consumed_at, expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_otp_user_lookup
  ON auth_otp_codes(user_id, purpose, consumed_at, expires_at);
