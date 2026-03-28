const { Router } = require("express");
const { z } = require("zod");

const auth = require("../../middlewares/auth");
const validate = require("../../common/validate");
const templatesController = require("./templates.controller");

const router = Router();

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  isActive: z.coerce.boolean().optional(),
});

const createTemplateSchema = z.object({
  templateName: z.string().trim().min(1).max(150),
  subject: z.string().trim().max(255).optional(),
  previewText: z.string().trim().max(255).optional(),
  contentHtml: z.string().optional(),
  contentText: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateTemplateSchema = z
  .object({
    templateName: z.string().trim().min(1).max(150).optional(),
    subject: z.string().trim().max(255).optional(),
    previewText: z.string().trim().max(255).optional(),
    contentHtml: z.string().optional(),
    contentText: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

router.use(auth);

router.get(
  "/",
  validate({ query: listQuerySchema }),
  templatesController.listTemplates,
);
router.post(
  "/",
  validate({ body: createTemplateSchema }),
  templatesController.createTemplate,
);
router.get(
  "/:id",
  validate({ params: idParamSchema }),
  templatesController.getTemplateById,
);
router.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateTemplateSchema }),
  templatesController.updateTemplate,
);
router.delete(
  "/:id",
  validate({ params: idParamSchema }),
  templatesController.deleteTemplate,
);

module.exports = router;
