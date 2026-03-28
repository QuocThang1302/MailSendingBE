const { Router } = require("express");
const { z } = require("zod");

const auth = require("../../middlewares/auth");
const validate = require("../../common/validate");
const contactsController = require("./contacts.controller");

const router = Router();

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(150).optional(),
  status: z.string().trim().max(50).optional(),
  city: z.string().trim().max(100).optional(),
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

router.use(auth);

router.get(
  "/",
  validate({ query: listQuerySchema }),
  contactsController.listContacts,
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

module.exports = router;
