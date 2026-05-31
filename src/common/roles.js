const ROLES = Object.freeze({
  ADMIN: "admin",
  USER: "user",
});

const ROLE_VALUES = Object.freeze(Object.values(ROLES));

const normalizeRole = (role) => {
  const normalized = String(role || "").trim().toLowerCase();
  return ROLE_VALUES.includes(normalized) ? normalized : ROLES.USER;
};

const isAdmin = (actor) => normalizeRole(actor?.role) === ROLES.ADMIN;

module.exports = {
  ROLES,
  ROLE_VALUES,
  normalizeRole,
  isAdmin,
};
