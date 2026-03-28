const dotenv = require("dotenv");

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toInt(process.env.PORT, 5000),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseKey: process.env.SUPABASE_KEY || "",
  jwtSecret: process.env.JWT_SECRET || "change_me_in_production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  bcryptSaltRounds: toInt(process.env.BCRYPT_SALT_ROUNDS, 10),
};

if (!env.supabaseUrl) {
  throw new Error("Missing SUPABASE_URL in environment variables.");
}

if (!env.supabaseKey) {
  throw new Error("Missing SUPABASE_KEY in environment variables.");
}

module.exports = env;
