const { Router } = require("express");
const { z } = require("zod");
const multer = require("multer");

const auth = require("../../middlewares/auth");
const validate = require("../../common/validate");
const contactsController = require("./contacts.controller");

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const fieldIdParamSchema = z.object({
  fieldId: z.coerce.number().int().positive(),
});

const tagIdParamSchema = z.object({
  tagId: z.coerce.number().int().positive(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(150).optional(),
  status: z.string().trim().max(50).optional(),
  city: z.string().trim().max(100).optional(),
  tagId: z.coerce.number().int().positive().optional(),
});

const createContactSchema = z.object({
  email: z.string().email().max(150),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(50).optional(),
  company: z.string().trim().max(150).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  language: z.string().trim().max(20).optional(),
  emailStatus: z.string().trim().max(50).optional(),
  source: z.string().trim().max(100).optional(),
});

const updateContactSchema = z
  .object({
    email: z.string().email().max(150).optional(),
    firstName: z.string().trim().max(100).optional(),
    lastName: z.string().trim().max(100).optional(),
    phone: z.string().trim().max(50).optional(),
    company: z.string().trim().max(150).optional(),
    city: z.string().trim().max(100).optional(),
    country: z.string().trim().max(100).optional(),
    language: z.string().trim().max(20).optional(),
    emailStatus: z.string().trim().max(50).optional(),
    source: z.string().trim().max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

const createTagSchema = z.object({
  tagName: z.string().trim().min(1).max(100),
  color: z
    .string()
    .trim()
    .regex(
      /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
      "Color must be a valid hex value",
    )
    .optional(),
});

const replaceTagsSchema = z.object({
  tagIds: z.array(z.number().int().positive()).max(100),
});

const exportQuerySchema = z.object({
  format: z.enum(["csv", "xlsx"]).default("csv"),
  search: z.string().trim().max(150).optional(),
  status: z.string().trim().max(50).optional(),
  city: z.string().trim().max(100).optional(),
});

const importQuerySchema = z.object({
  mode: z.enum(["insert", "upsert"]).default("insert"),
});

const dynamicFieldTypeSchema = z.enum([
  "text",
  "number",
  "date",
  "boolean",
  "url",
]);

const createDynamicFieldSchema = z.object({
  fieldName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]*$/,
      "fieldName must be snake_case or camelCase",
    ),
  fieldLabel: z.string().trim().max(150).optional(),
  fieldType: dynamicFieldTypeSchema.optional(),
  isRequired: z.boolean().optional(),
});

const updateDynamicFieldSchema = z
  .object({
    fieldName: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(
        /^[a-zA-Z][a-zA-Z0-9_]*$/,
        "fieldName must be snake_case or camelCase",
      )
      .optional(),
    fieldLabel: z.string().trim().max(150).optional(),
    fieldType: dynamicFieldTypeSchema.optional(),
    isRequired: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

const replaceContactFieldValuesSchema = z.object({
  values: z
    .array(
      z.object({
        fieldId: z.number().int().positive(),
        value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
      }),
    )
    .max(200),
});

router.use(auth);

router.get(
  "/",
  validate({ query: listQuerySchema }),
  contactsController.listContacts,
);
router.post(
  "/import",
  validate({ query: importQuerySchema }),
  upload.single("file"),
  contactsController.importContacts,
);
router.get(
  "/export",
  validate({ query: exportQuerySchema }),
  contactsController.exportContacts,
);
router.get("/fields", contactsController.listDynamicFields);
router.post(
  "/fields",
  validate({ body: createDynamicFieldSchema }),
  contactsController.createDynamicField,
);
router.patch(
  "/fields/:fieldId",
  validate({ params: fieldIdParamSchema, body: updateDynamicFieldSchema }),
  contactsController.updateDynamicField,
);
router.delete(
  "/fields/:fieldId",
  validate({ params: fieldIdParamSchema }),
  contactsController.deleteDynamicField,
);
router.post(
  "/",
  validate({ body: createContactSchema }),
  contactsController.createContact,
);

router.get("/tags", contactsController.listTags);
router.post(
  "/tags",
  validate({ body: createTagSchema }),
  contactsController.createTag,
);
router.get(
  "/tags/:tagId/recipients",
  validate({ params: tagIdParamSchema }),
  contactsController.listTagRecipients,
);

router.get(
  "/:id",
  validate({ params: idParamSchema }),
  contactsController.getContactById,
);
router.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateContactSchema }),
  contactsController.updateContact,
);
router.delete(
  "/:id",
  validate({ params: idParamSchema }),
  contactsController.deleteContact,
);
router.put(
  "/:id/tags",
  validate({ params: idParamSchema, body: replaceTagsSchema }),
  contactsController.replaceContactTags,
);
router.get(
  "/:id/fields",
  validate({ params: idParamSchema }),
  contactsController.listContactFieldValues,
);
router.put(
  "/:id/fields",
  validate({ params: idParamSchema, body: replaceContactFieldValuesSchema }),
  contactsController.replaceContactFieldValues,
);

module.exports = router;
