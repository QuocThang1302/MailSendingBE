const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const ApiError = require("../../common/ApiError");
const env = require("../../config/env");
const { ROLES, normalizeRole } = require("../../common/roles");
const authRepository = require("./auth.repository");
const authOtpRepository = require("./authOtp.repository");
const { sendOtpEmail } = require("./authOtp.mailer");
const crypto = require("crypto");

const OTP_PURPOSE = {
  REGISTER: "register",
  PASSWORD_CHANGE: "password_change",
  PASSWORD_RESET: "password_reset",
  EMAIL_CHANGE: "email_change",
};

const toAuthPayload = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: normalizeRole(user.role),
  isActive: user.is_active,
  createdAt: user.created_at || null,
  updatedAt: user.updated_at || null,
  lastLogin: user.last_login || null,
});

const signToken = (user) => {
  return jwt.sign(
    {
      email: user.email,
      role: normalizeRole(user.role),
    },
    env.jwtSecret,
    {
      subject: String(user.id),
      expiresIn: env.jwtExpiresIn,
    },
  );
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const createOtpCode = () =>
  crypto.randomInt(100000, 1000000).toString().padStart(6, "0");

const hashOtp = ({ email, purpose, code }) =>
  crypto
    .createHmac("sha256", env.otpSecret)
    .update(`${purpose}:${normalizeEmail(email)}:${String(code || "").trim()}`)
    .digest("hex");

const verifyOtpCode = (record, code) => {
  const expectedHash = hashOtp({
    email: record.email,
    purpose: record.purpose,
    code,
  });
  const provided = Buffer.from(record.code_hash || "", "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return (
    provided.length === expected.length &&
    crypto.timingSafeEqual(provided, expected)
  );
};

const createAndSendOtp = async ({ email, purpose, payload, userId = null }) => {
  const normalizedEmail = normalizeEmail(email);
  const code = createOtpCode();
  const expiresAt = new Date(
    Date.now() + env.otpExpiresMinutes * 60 * 1000,
  ).toISOString();

  await authOtpRepository.invalidateOtps({
    email: normalizedEmail,
    purpose,
    userId,
  });
  await authOtpRepository.createOtp({
    email: normalizedEmail,
    purpose,
    codeHash: hashOtp({ email: normalizedEmail, purpose, code }),
    expiresAt,
    payload,
    userId,
  });
  await sendOtpEmail({
    to: normalizedEmail,
    purpose,
    code,
    expiresInMinutes: env.otpExpiresMinutes,
  });

  return {
    email: normalizedEmail,
    expiresInMinutes: env.otpExpiresMinutes,
    requiresOtp: true,
  };
};

const assertOtp = async ({ email, purpose, code, userId = null }) => {
  const normalizedEmail = normalizeEmail(email);
  const record = await authOtpRepository.findActiveOtp({
    email: normalizedEmail,
    purpose,
    userId,
  });
  if (!record) {
    throw new ApiError(400, "OTP is invalid or expired");
  }

  if (Number(record.attempt_count || 0) >= env.otpMaxAttempts) {
    await authOtpRepository.consumeOtp(record.id);
    throw new ApiError(429, "Too many OTP attempts. Please request a new code.");
  }

  if (!verifyOtpCode(record, code)) {
    const nextAttemptCount = Number(record.attempt_count || 0) + 1;
    await authOtpRepository.incrementAttempts(record.id, nextAttemptCount);
    if (nextAttemptCount >= env.otpMaxAttempts) {
      await authOtpRepository.consumeOtp(record.id);
    }
    throw new ApiError(400, "OTP is invalid or expired");
  }

  return record;
};

const register = async ({ name, email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const existing = await authRepository.findUserByEmail(normalizedEmail);
  if (existing) {
    throw new ApiError(409, "Email already exists");
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);
  return createAndSendOtp({
    email: normalizedEmail,
    purpose: OTP_PURPOSE.REGISTER,
    payload: {
      name: String(name || "").trim(),
      passwordHash,
    },
  });
};

const verifyRegistrationOtp = async ({ email, otp }) => {
  const normalizedEmail = normalizeEmail(email);
  const record = await assertOtp({
    email: normalizedEmail,
    purpose: OTP_PURPOSE.REGISTER,
    code: otp,
  });

  const existing = await authRepository.findUserByEmail(normalizedEmail);
  if (existing) {
    await authOtpRepository.consumeOtp(record.id);
    throw new ApiError(409, "Email already exists");
  }

  const payload = record.payload || {};
  const user = await authRepository.createUser({
    name: String(payload.name || normalizedEmail.split("@")[0]).trim(),
    email: normalizedEmail,
    password: payload.passwordHash,
    role: ROLES.USER,
  });
  await authOtpRepository.consumeOtp(record.id);

  const token = signToken(user);
  return {
    user: toAuthPayload(user),
    token,
  };
};

const requestPasswordChangeOtp = async (
  userId,
  { currentPassword, newPassword },
) => {
  const user = await authRepository.findUserCredentialsById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (!user.is_active) {
    throw new ApiError(403, "User is inactive");
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.password);
  if (!passwordMatches) {
    throw new ApiError(401, "Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
  return createAndSendOtp({
    email: user.email,
    purpose: OTP_PURPOSE.PASSWORD_CHANGE,
    payload: {
      passwordHash,
    },
    userId: user.id,
  });
};

const verifyPasswordChangeOtp = async (userId, { otp }) => {
  const user = await authRepository.findUserCredentialsById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const record = await assertOtp({
    email: user.email,
    purpose: OTP_PURPOSE.PASSWORD_CHANGE,
    code: otp,
    userId: user.id,
  });

  const payload = record.payload || {};
  if (!payload.passwordHash) {
    await authOtpRepository.consumeOtp(record.id);
    throw new ApiError(400, "OTP payload is invalid");
  }

  await authRepository.updatePassword(user.id, payload.passwordHash);
  await authOtpRepository.consumeOtp(record.id);

  return {
    ok: true,
  };
};

const requestPasswordResetOtp = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await authRepository.findUserByEmail(normalizedEmail);

  if (!user) {
    throw new ApiError(404, "Email is not registered");
  }

  if (!user.is_active) {
    throw new ApiError(403, "User is inactive");
  }

  return createAndSendOtp({
    email: normalizedEmail,
    purpose: OTP_PURPOSE.PASSWORD_RESET,
    payload: {},
    userId: user.id,
  });
};

const verifyPasswordResetOtp = async ({ email, otp, newPassword }) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await authRepository.findUserByEmail(normalizedEmail);
  if (!user || !user.is_active) {
    throw new ApiError(400, "OTP is invalid or expired");
  }

  const record = await assertOtp({
    email: normalizedEmail,
    purpose: OTP_PURPOSE.PASSWORD_RESET,
    code: otp,
    userId: user.id,
  });

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
  await authRepository.updatePassword(user.id, passwordHash);
  await authOtpRepository.consumeOtp(record.id);

  return {
    ok: true,
  };
};

const updateProfile = async (userId, { name, email }) => {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const nextName = String(name || "").trim();
  const nextEmail = normalizeEmail(email || user.email);
  if (!nextName) {
    throw new ApiError(400, "Name is required");
  }
  if (!nextEmail) {
    throw new ApiError(400, "Email is required");
  }

  const currentEmail = normalizeEmail(user.email);
  if (nextEmail !== currentEmail) {
    const existing = await authRepository.findUserByEmail(nextEmail);
    if (existing && Number(existing.id) !== Number(user.id)) {
      throw new ApiError(409, "Email already exists");
    }

    await authOtpRepository.invalidateUserOtps({
      purpose: OTP_PURPOSE.EMAIL_CHANGE,
      userId: user.id,
    });
    return createAndSendOtp({
      email: nextEmail,
      purpose: OTP_PURPOSE.EMAIL_CHANGE,
      payload: {
        name: nextName,
        email: nextEmail,
      },
      userId: user.id,
    });
  }

  const updatedUser = await authRepository.updateProfile(user.id, {
    name: nextName,
  });

  return {
    requiresOtp: false,
    user: toAuthPayload(updatedUser),
  };
};

const verifyProfileEmailOtp = async (userId, { email, otp }) => {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const nextEmail = normalizeEmail(email);
  if (!nextEmail) {
    throw new ApiError(400, "Email is required");
  }

  const record = await assertOtp({
    email: nextEmail,
    purpose: OTP_PURPOSE.EMAIL_CHANGE,
    code: otp,
    userId: user.id,
  });

  const existing = await authRepository.findUserByEmail(nextEmail);
  if (existing && Number(existing.id) !== Number(user.id)) {
    await authOtpRepository.consumeOtp(record.id);
    throw new ApiError(409, "Email already exists");
  }

  const payload = record.payload || {};
  const nextName = String(payload.name || user.name).trim();
  const updatedUser = await authRepository.updateProfile(user.id, {
    name: nextName,
    email: nextEmail,
  });
  await authOtpRepository.consumeOtp(record.id);

  return {
    requiresOtp: false,
    user: toAuthPayload(updatedUser),
  };
};

const login = async ({ email, password }) => {
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.is_active) {
    throw new ApiError(403, "User is inactive");
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password");
  }

  await authRepository.updateLastLogin(user.id);

  const token = signToken(user);
  return {
    user: toAuthPayload(user),
    token,
  };
};

const getMe = async (userId) => {
  const user = await authRepository.findUserById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return toAuthPayload(user);
};

module.exports = {
  register,
  verifyRegistrationOtp,
  login,
  getMe,
  requestPasswordChangeOtp,
  verifyPasswordChangeOtp,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  updateProfile,
  verifyProfileEmailOtp,
};
