const { Router } = require("express");
const { z } = require("zod");

const auth = require("../../middlewares/auth");
const validate = require("../../common/validate");
const campaignsController = require("./campaigns.controller");

const router = Router();

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().trim().max(50).optional(),
});

const createCampaignSchema = z.object({
  campaignName: z.string().trim().min(1).max(200),
  templateId: z.number().int().positive(),
  emailAccountId: z.number().int().positive(),
  segmentId: z.number().int().positive().optional(),
  campaignType: z.enum(["regular", "ab_test", "automated"]).optional(),
  scheduledTime: z.string().datetime().optional(),
  contactIds: z.array(z.number().int().positive()).max(50000).optional(),
});

router.use(auth);

router.get(
  "/",
  validate({ query: listQuerySchema }),
  campaignsController.listCampaigns,
);
router.post(
  "/",
  validate({ body: createCampaignSchema }),
  campaignsController.createCampaign,
);
router.get(
  "/:id",
  validate({ params: idParamSchema }),
  campaignsController.getCampaignById,
);
router.get(
  "/:id/recipients",
  validate({ params: idParamSchema, query: listQuerySchema }),
  campaignsController.listCampaignRecipients,
);
router.post(
  "/:id/start",
  validate({ params: idParamSchema }),
  campaignsController.startCampaign,
);
router.post(
  "/:id/pause",
  validate({ params: idParamSchema }),
  campaignsController.pauseCampaign,
);

module.exports = router;
