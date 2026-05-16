-- Make newly registered/directly inserted users regular users by default.
-- Admin accounts should be created explicitly, for example via seed data or an
-- admin-only management flow.

ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'user';

