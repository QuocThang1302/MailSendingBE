const jwt = require("jsonwebtoken");
const ApiError = require("../common/ApiError");
const env = require("../config/env");
const { supabase } = require("../config/supabase");
const { normalizeRole } = require("../common/roles");

const auth = async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new ApiError(401, "Unauthorized"));
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (_error) {
    return next(new ApiError(401, "Invalid or expired token"));
  }

  const userId = Number.parseInt(payload.sub, 10);

  if (!Number.isInteger(userId) || userId <= 0) {
    return next(new ApiError(401, "Invalid token subject"));
  }

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, role, is_active")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return next(error);
    }

    if (!user) {
      return next(new ApiError(401, "Unauthorized"));
    }

    if (!user.is_active) {
      return next(new ApiError(403, "User is inactive"));
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      isActive: user.is_active,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = auth;
