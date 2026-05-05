const { Router } = require("express");
const multer = require("multer");
const { z } = require("zod");

const auth = require("../../middlewares/auth");
const validate = require("../../common/validate");
const individualEmailsController = require("./individualEmails.controller");

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const sendBaseSchema = z.object({
  emailAccountId: z.number().int().positive().optional(),
  subject: z.string().trim().min(1).max(255),
  content: z.string().trim().min(1).max(50000),
  htmlContent: z.string().max(200000).optional(),
});

const previewSchema = sendBaseSchema.extend({
  previewEmail: z.string().email().max(150),
});

const sendSchema = sendBaseSchema.extend({
  recipients: z.array(z.string().email().max(150)).min(1).max(200),
});

router.use(auth);

router.post(
  "/import-recipients",
  upload.single("file"),
  individualEmailsController.importRecipients,
);
router.post(
  "/preview",
  validate({ body: previewSchema }),
  individualEmailsController.sendPreview,
);
router.post(
  "/send",
  validate({ body: sendSchema }),
  individualEmailsController.sendEmails,
);

module.exports = router;
