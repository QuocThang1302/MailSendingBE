const asyncHandler = require("../../common/asyncHandler");
const { sendOk } = require("../../common/http");
const authService = require("./auth.service");

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
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

module.exports = {
  register,
  login,
  me,
};
