-- Allow profile email-change OTPs for databases that already created auth_otp_codes.

DO $$
BEGIN
  IF to_regclass('public.auth_otp_codes') IS NOT NULL THEN
    ALTER TABLE auth_otp_codes
      DROP CONSTRAINT IF EXISTS auth_otp_codes_purpose_check;

    ALTER TABLE auth_otp_codes
      ADD CONSTRAINT auth_otp_codes_purpose_check
      CHECK (purpose IN ('register', 'password_change', 'email_change'));
  END IF;
END $$;
