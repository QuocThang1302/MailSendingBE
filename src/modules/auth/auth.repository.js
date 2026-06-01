const { supabase } = require("../../config/supabase");

const throwIfError = (error) => {
  if (error) {
    throw new Error(error.message);
  }
};

const findUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, name, email, password, role, is_active, created_at, updated_at, last_login",
    )
    .eq("email", email)
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const findUserById = async (id) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, is_active, created_at, updated_at, last_login")
    .eq("id", id)
    .maybeSingle();

  throwIfError(error);
  return data || null;
};

const findUserCredentialsById = async (id) => {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, name, email, password, role, is_active, created_at, updated_at, last_login",
    )
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
    .select("id, name, email, role, is_active, created_at, updated_at, last_login")
    .maybeSingle();

  throwIfError(error);
  return data;
};

const updatePassword = async (id, passwordHash) => {
  const { error } = await supabase
    .from("users")
    .update({
      password: passwordHash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  throwIfError(error);
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

const updateProfile = async (id, { name, email }) => {
  const updates = {
    updated_at: new Date().toISOString(),
  };

  if (name !== undefined) {
    updates.name = name;
  }
  if (email !== undefined) {
    updates.email = email;
  }

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id)
    .select("id, name, email, role, is_active, created_at, updated_at, last_login")
    .maybeSingle();

  throwIfError(error);
  return data;
};

module.exports = {
  findUserCredentialsById,
  findUserByEmail,
  findUserById,
  createUser,
  updatePassword,
  updateLastLogin,
  updateProfile,
};
