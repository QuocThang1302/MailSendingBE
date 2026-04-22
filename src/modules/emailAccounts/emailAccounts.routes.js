const { Router } = require("express");
const { z } = require("zod");

const auth = require("../../middlewares/auth");
const validate = require("../../common/validate");
const emailAccountsController = require("./emailAccounts.controller");

const router = Router();

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createEmailAccountSchema = z.object({
  emailAddress: z.string().email().max(150),
  displayName: z.string().trim().max(150).optional(),
  smtpHost: z.string().trim().max(150).optional(),
  smtpPort: z.number().int().positive().max(65535).optional(),
  smtpUsername: z.string().trim().max(150).optional(),
  smtpPassword: z.string().max(255).optional(),
  useTls: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  status: z.string().trim().max(50).optional(),
  dailyLimit: z.number().int().positive().max(100000).optional(),
});

const updateEmailAccountSchema = z
  .object({
    emailAddress: z.string().email().max(150).optional(),
    displayName: z.string().trim().max(150).optional(),
    smtpHost: z.string().trim().max(150).optional(),
    smtpPort: z.number().int().positive().max(65535).optional(),
    smtpUsername: z.string().trim().max(150).optional(),
    smtpPassword: z.string().max(255).optional(),
    useTls: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    status: z.string().trim().max(50).optional(),
    dailyLimit: z.number().int().positive().max(100000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

const testSmtpSchema = z
  .object({
    accountId: z.number().int().positive().optional(),
    emailAddress: z.string().email().max(150).optional(),
    displayName: z.string().trim().max(150).optional(),
    smtpHost: z.string().trim().max(150).optional(),
    smtpPort: z.number().int().positive().max(65535).optional(),
    smtpUsername: z.string().trim().max(150).optional(),
    smtpPassword: z.string().max(255).optional(),
    useTls: z.boolean().optional(),
  })
  .refine((value) => value.accountId || value.smtpHost || value.smtpUsername, {
    message: "Provide an accountId or SMTP settings to test",
  });

router.use(auth);

router.get("/", emailAccountsController.listEmailAccounts);
router.post(
  "/",
  validate({ body: createEmailAccountSchema }),
  emailAccountsController.createEmailAccount,
);
router.post(
  "/test",
  validate({ body: testSmtpSchema }),
  emailAccountsController.testSmtpConnection,
);
router.get(
  "/:id",
  validate({ params: idParamSchema }),
  emailAccountsController.getEmailAccountById,
);
router.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateEmailAccountSchema }),
  emailAccountsController.updateEmailAccount,
);
router.delete(
  "/:id",
  validate({ params: idParamSchema }),
  emailAccountsController.deleteEmailAccount,
);
router.post(
  "/:id/default",
  validate({ params: idParamSchema }),
  emailAccountsController.setDefaultEmailAccount,
);
router.post(
  "/:id/test",
  validate({ params: idParamSchema, body: sendTestEmailSchema }),
  emailAccountsController.sendEmailAccountTest,
);

module.exports = router;
