const dotenv = require("dotenv");

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toBool = (value, fallback) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toInt(process.env.PORT, 5000),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseKey: process.env.SUPABASE_KEY || "",
  jwtSecret: process.env.JWT_SECRET || "change_me_in_production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  trackingSecret:
    process.env.TRACKING_SECRET ||
    process.env.JWT_SECRET ||
    "change_me_in_production",
  bcryptSaltRounds: toInt(process.env.BCRYPT_SALT_ROUNDS, 10),
  schedulerEnabled: toBool(process.env.SCHEDULER_ENABLED, true),
  schedulerIntervalMs: toInt(process.env.SCHEDULER_INTERVAL_MS, 15000),
  schedulerBatchSize: toInt(process.env.SCHEDULER_BATCH_SIZE, 50),
  schedulerLockTtlSeconds: toInt(process.env.SCHEDULER_LOCK_TTL_SECONDS, 25),
  aiMediaProvider: process.env.AI_MEDIA_PROVIDER || "pollinations",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
  openaiVideoModel: process.env.OPENAI_VIDEO_MODEL || "sora-2",
  pollinationsApiKey: process.env.POLLINATIONS_API_KEY || "",
  pollinationsBaseUrl:
    process.env.POLLINATIONS_BASE_URL || "https://gen.pollinations.ai",
  pollinationsImageModel: process.env.POLLINATIONS_IMAGE_MODEL || "flux",
  pollinationsVideoModel: process.env.POLLINATIONS_VIDEO_MODEL || "",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
  mediaPublicBaseUrl: process.env.MEDIA_PUBLIC_BASE_URL || "",
};

if (!env.supabaseUrl) {
  throw new Error("Missing SUPABASE_URL in environment variables.");
}

if (!env.supabaseKey) {
  throw new Error("Missing SUPABASE_KEY in environment variables.");
}

module.exports = env;
