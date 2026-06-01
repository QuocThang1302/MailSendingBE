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

const toChoice = (value, choices, fallback) => {
  const normalized = String(value || "").trim().toLowerCase();
  return choices.includes(normalized) ? normalized : fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toInt(process.env.PORT, 5000),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseKey: process.env.SUPABASE_KEY || "",
  jwtSecret: process.env.JWT_SECRET || "change_me_in_production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  otpSecret:
    process.env.OTP_SECRET ||
    process.env.JWT_SECRET ||
    "change_me_in_production",
  otpExpiresMinutes: toInt(process.env.OTP_EXPIRES_MINUTES, 10),
  otpMaxAttempts: toInt(process.env.OTP_MAX_ATTEMPTS, 5),
  otpEmailFrom: process.env.OTP_EMAIL_FROM || "",
  otpSmtpHost: process.env.OTP_SMTP_HOST || "",
  otpSmtpPort: toInt(process.env.OTP_SMTP_PORT, 587),
  otpSmtpUsername: process.env.OTP_SMTP_USERNAME || "",
  otpSmtpPassword: process.env.OTP_SMTP_PASSWORD || "",
  otpSmtpUseTls: toBool(process.env.OTP_SMTP_USE_TLS, true),
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
  mediaStorageProvider: process.env.MEDIA_STORAGE_PROVIDER || "local",
  supabaseStorageBucket:
    process.env.SUPABASE_STORAGE_BUCKET || "generated-media",
  supabaseStorageFolder: process.env.SUPABASE_STORAGE_FOLDER || "generated",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
  mediaPublicBaseUrl: process.env.MEDIA_PUBLIC_BASE_URL || "",
  emailOpenTrackingEnabled: toBool(
    process.env.EMAIL_OPEN_TRACKING_ENABLED,
    false,
  ),
  emailClickTrackingMode: toChoice(
    process.env.EMAIL_CLICK_TRACKING_MODE,
    ["none", "marked", "all"],
    "marked",
  ),
  emailTrackingRequireHttps: toBool(
    process.env.EMAIL_TRACKING_REQUIRE_HTTPS,
    true,
  ),
  emailAppendUnsubscribeFooter: toBool(
    process.env.EMAIL_APPEND_UNSUBSCRIBE_FOOTER,
    true,
  ),
};

if (!env.supabaseUrl) {
  throw new Error("Missing SUPABASE_URL in environment variables.");
}

if (!env.supabaseKey) {
  throw new Error("Missing SUPABASE_KEY in environment variables.");
}

module.exports = env;
