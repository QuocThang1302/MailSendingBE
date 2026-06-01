const asyncHandler = require("../../common/asyncHandler");
const { sendOk } = require("../../common/http");
const authService = require("./auth.service");

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  return sendOk(res, data, "Registration OTP sent", 202);
});

const verifyRegistrationOtp = asyncHandler(async (req, res) => {
  const data = await authService.verifyRegistrationOtp(req.body);
  return sendOk(res, data, "Register successful", 201);
});

const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  return sendOk(res, data, "Login successful");
});

const me = asyncHandler(async (req, res) => {
  const data = await authService.getMe(req.user.id);
  return sendOk(res, data, "Fetched profile");
});

const requestPasswordChangeOtp = asyncHandler(async (req, res) => {
  const data = await authService.requestPasswordChangeOtp(req.user.id, req.body);
  return sendOk(res, data, "Password change OTP sent");
});

const verifyPasswordChangeOtp = asyncHandler(async (req, res) => {
  const data = await authService.verifyPasswordChangeOtp(req.user.id, req.body);
  return sendOk(res, data, "Password updated");
});

const updateProfile = asyncHandler(async (req, res) => {
  const data = await authService.updateProfile(req.user.id, req.body);
  const message = data.requiresOtp
    ? "Profile email OTP sent"
    : "Profile updated";
  return sendOk(res, data, message);
});

const verifyProfileEmailOtp = asyncHandler(async (req, res) => {
  const data = await authService.verifyProfileEmailOtp(req.user.id, req.body);
  return sendOk(res, data, "Profile email updated");
});

module.exports = {
  register,
  verifyRegistrationOtp,
  login,
  me,
  requestPasswordChangeOtp,
  verifyPasswordChangeOtp,
  updateProfile,
  verifyProfileEmailOtp,
};
