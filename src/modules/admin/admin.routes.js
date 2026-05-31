const { Router } = require("express");
const { z } = require("zod");

const validate = require("../../common/validate");
const { ROLES } = require("../../common/roles");
const auth = require("../../middlewares/auth");
const { requireRole } = require("../../middlewares/authorize");
const adminController = require("./admin.controller");

const router = Router();

const booleanQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === "") {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no"].includes(normalized)) {
    return false;
  }
  return value;
}, z.boolean().optional());

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum([ROLES.ADMIN, ROLES.USER]).optional(),
  isActive: booleanQuerySchema,
});

const updateUserRoleSchema = z.object({
  role: z.enum([ROLES.ADMIN, ROLES.USER]),
});

const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

router.use(auth, requireRole(ROLES.ADMIN));

router.get("/overview", adminController.getOverview);

router.get(
  "/users",
  validate({ query: listUsersQuerySchema }),
  adminController.listUsers,
);
router.get(
  "/users/:id",
  validate({ params: idParamSchema }),
  adminController.getUserById,
);
router.patch(
  "/users/:id/role",
  validate({ params: idParamSchema, body: updateUserRoleSchema }),
  adminController.updateUserRole,
);
router.patch(
  "/users/:id/status",
  validate({ params: idParamSchema, body: updateUserStatusSchema }),
  adminController.updateUserStatus,
);

router.delete(
  "/templates/:id",
  validate({ params: idParamSchema }),
  adminController.deleteTemplate,
);

router.post(
  "/campaigns/:id/pause",
  validate({ params: idParamSchema }),
  adminController.pauseCampaign,
);
router.delete(
  "/campaigns/:id",
  validate({ params: idParamSchema }),
  adminController.deleteCampaign,
);

module.exports = router;
