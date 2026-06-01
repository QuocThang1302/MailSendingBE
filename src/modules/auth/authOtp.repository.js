const { supabase } = require("../../config/supabase");

const throwIfError = (error) => {
  if (error) {
    throw new Error(error.message);
  }
};

const invalidateOtps = async ({ email, purpose, userId = null }) => {
  let builder = supabase
    .from("auth_otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("email", email)
    .eq("purpose", purpose)
    .is("consumed_at", null);

  builder = userId ? builder.eq("user_id", userId) : builder.is("user_id", null);

  const { error } = await builder;
  throwIfError(error);
};

const invalidateUserOtps = async ({ purpose, userId }) => {
  const { error } = await supabase
    .from("auth_otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("purpose", purpose)
    .eq("user_id", userId)
    .is("consumed_at", null);

  throwIfError(error);
};

const createOtp = async ({
  email,
  purpose,
  codeHash,
  expiresAt,
  payload = {},
  userId = null,
}) => {
  const { data, error } = await supabase
    .from("auth_otp_codes")
    .insert({
      email,
      purpose,
      code_hash: codeHash,
      expires_at: expiresAt,
      payload,
      user_id: userId,
    })
    .select("id, email, purpose, expires_at, created_at")
    .maybeSingle();

  throwIfError(error);
  return data;
};

const findActiveOtp = async ({ email, purpose, userId = null }) => {
  const now = new Date().toISOString();
  let builder = supabase
    .from("auth_otp_codes")
    .select(
      "id, user_id, email, purpose, code_hash, payload, expires_at, attempt_count, created_at",
    )
    .eq("email", email)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .gt("expires_at", now);

  builder = userId ? builder.eq("user_id", userId) : builder.is("user_id", null);

  const { data, error } = await builder
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const incrementAttempts = async (id, attemptCount) => {
  const { error } = await supabase
    .from("auth_otp_codes")
    .update({ attempt_count: attemptCount })
    .eq("id", id);

  throwIfError(error);
};

const consumeOtp = async (id) => {
  const { error } = await supabase
    .from("auth_otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", id);

  throwIfError(error);
};

module.exports = {
  consumeOtp,
  createOtp,
  findActiveOtp,
  incrementAttempts,
  invalidateOtps,
  invalidateUserOtps,
};
