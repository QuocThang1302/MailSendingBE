const { supabase } = require("../../config/supabase");

const throwIfError = (error) => {
  if (error) {
    throw new Error(error.message);
  }
};

const findUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, password, role, is_active, created_at")
    .eq("email", email)
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const findUserById = async (id) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, is_active, created_at, last_login")
    .eq("id", id)
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const createUser = async ({ name, email, password, role }) => {
  const { data, error } = await supabase
    .from("users")
    .insert({
      name,
      email,
      password,
      role,
      is_active: true,
    })
    .select("id, name, email, role, is_active, created_at")
    .maybeSingle();

  throwIfError(error);
  return data;
};

const updateLastLogin = async (id) => {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("users")
    .update({
      last_login: now,
      updated_at: now,
    })
    .eq("id", id);

  throwIfError(error);
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateLastLogin,
};
