const { Router } = require("express");
const { z } = require("zod");

const auth = require("../../middlewares/auth");
const validate = require("../../common/validate");
const templatesController = require("./templates.controller");

const router = Router();

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const versionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  versionId: z.coerce.number().int().positive(),
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

const designerBlockSchema = z.lazy(() =>
  z.object({
    id: z.string().trim().min(1).max(100),
    type: z.string().trim().min(1).max(100),
    props: z.record(z.string(), z.any()).optional(),
    children: z.array(designerBlockSchema).optional(),
  }),
);

const designerLayoutSchema = z.object({
  schemaVersion: z.coerce.number().int().positive().default(1),
  blocks: z.array(designerBlockSchema).default([]),
});

const saveDesignerSchema = z.object({
  layout: designerLayoutSchema,
  editorState: z.record(z.string(), z.any()).optional(),
  renderedHtml: z.string().optional(),
  renderedText: z.string().optional(),
  note: z.string().trim().max(255).optional(),
});

const publishDesignerSchema = z.object({
  layout: designerLayoutSchema.optional(),
  editorState: z.record(z.string(), z.any()).optional(),
  renderedHtml: z.string().optional(),
  renderedText: z.string().optional(),
  note: z.string().trim().max(255).optional(),
});

const versionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
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
router.get(
  "/:id/designer",
  validate({ params: idParamSchema }),
  templatesController.getTemplateDesigner,
);
router.put(
  "/:id/designer",
  validate({ params: idParamSchema, body: saveDesignerSchema }),
  templatesController.saveTemplateDesigner,
);
router.post(
  "/:id/designer/publish",
  validate({ params: idParamSchema, body: publishDesignerSchema }),
  templatesController.publishTemplateDesigner,
);
router.get(
  "/:id/designer/versions",
  validate({ params: idParamSchema, query: versionsQuerySchema }),
  templatesController.listTemplateDesignerVersions,
);
router.get(
  "/:id/designer/versions/:versionId",
  validate({ params: versionIdParamSchema }),
  templatesController.getTemplateDesignerVersion,
);
router.post(
  "/:id/designer/versions/:versionId/restore",
  validate({ params: versionIdParamSchema }),
  templatesController.restoreTemplateDesignerVersion,
);
router.delete(
  "/:id",
  validate({ params: idParamSchema }),
  templatesController.deleteTemplate,
);

module.exports = router;
