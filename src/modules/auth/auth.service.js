const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const ApiError = require("../../common/ApiError");
const env = require("../../config/env");
const authRepository = require("./auth.repository");

const toAuthPayload = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.is_active,
});

const signToken = (user) => {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
    },
    env.jwtSecret,
    {
      subject: String(user.id),
      expiresIn: env.jwtExpiresIn,
    },
  );
};

const register = async ({ name, email, password, role = "admin" }) => {
  const existing = await authRepository.findUserByEmail(email);
  if (existing) {
    throw new ApiError(409, "Email already exists");
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);
  const user = await authRepository.createUser({
    name,
    email,
    password: passwordHash,
    role,
  });

  const token = signToken(user);
  return {
    user: toAuthPayload(user),
    token,
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
  login,
  getMe,
};
