const { Router } = require("express");
const multer = require("multer");

const auth = require("../../middlewares/auth");
const validate = require("../../common/validate");
const campaignsController = require("./campaigns.controller");

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const {
  idParamSchema,
  recipientParamSchema,
  listQuerySchema,
  createCampaignSchema,
  updateCampaignSchema,
  campaignRecipientSchema,
} = require("./dto/campaigns.dto");

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
router.post(
  "/import-recipients",
  upload.single("file"),
  campaignsController.importRecipients,
);
router.get(
  "/:id",
  validate({ params: idParamSchema }),
  campaignsController.getCampaignById,
);
router.put(
  "/:id",
  validate({ params: idParamSchema, body: updateCampaignSchema }),
  campaignsController.updateCampaign,
);
router.delete(
  "/:id",
  validate({ params: idParamSchema }),
  campaignsController.deleteCampaign,
);
router.get(
  "/:id/recipients",
  validate({ params: idParamSchema, query: listQuerySchema }),
  campaignsController.listCampaignRecipients,
);
router.post(
  "/:id/recipients",
  validate({ params: idParamSchema, body: campaignRecipientSchema }),
  campaignsController.createCampaignRecipient,
);
router.get(
  "/:id/recipients/:recipientId",
  validate({ params: recipientParamSchema }),
  campaignsController.getCampaignRecipientById,
);
router.patch(
  "/:id/recipients/:recipientId",
  validate({ params: recipientParamSchema, body: campaignRecipientSchema }),
  campaignsController.updateCampaignRecipient,
);
router.delete(
  "/:id/recipients/:recipientId",
  validate({ params: recipientParamSchema }),
  campaignsController.deleteCampaignRecipient,
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
router.post(
  "/:id/resume",
  validate({ params: idParamSchema }),
  campaignsController.resumeCampaign,
);

module.exports = router;
