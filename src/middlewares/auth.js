const jwt = require("jsonwebtoken");
const ApiError = require("../common/ApiError");
const env = require("../config/env");

const auth = (req, _res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new ApiError(401, "Unauthorized"));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = {
      id: Number.parseInt(payload.sub, 10),
      email: payload.email,
      role: payload.role,
    };
    return next();
  } catch (_error) {
    return next(new ApiError(401, "Invalid or expired token"));
  }
};

module.exports = auth;
