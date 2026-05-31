const ApiError = require("../common/ApiError");
const { normalizeRole } = require("../common/roles");

const requireRole =
  (...allowedRoles) =>
  (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Unauthorized"));
    }

    const normalizedAllowedRoles = allowedRoles
      .flat()
      .map((role) => String(role || "").trim().toLowerCase())
      .filter(Boolean);
    const currentRole = normalizeRole(req.user.role);

    if (!normalizedAllowedRoles.includes(currentRole)) {
      return next(new ApiError(403, "Forbidden"));
    }

    return next();
  };

module.exports = {
  requireRole,
};
