const { createClient } = require("@supabase/supabase-js");
const env = require("./env");

const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = {
  supabase,
};
