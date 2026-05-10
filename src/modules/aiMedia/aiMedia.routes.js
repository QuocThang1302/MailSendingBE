const { Router } = require("express");
const { z } = require("zod");

const auth = require("../../middlewares/auth");
const validate = require("../../common/validate");
const aiMediaController = require("./aiMedia.controller");

const router = Router();

const imageSizeSchema = z.enum([
  "1024x1024",
  "1024x1536",
  "1536x1024",
  "auto",
]);

const videoSizeSchema = z.enum([
  "720x1280",
  "1280x720",
  "1024x1792",
  "1792x1024",
]);

const generateImageSchema = z.object({
  prompt: z.string().trim().min(10).max(4000),
  altText: z.string().trim().max(255).optional(),
  size: imageSizeSchema.optional(),
  model: z.string().trim().min(1).max(100).optional(),
  emailWidth: z.coerce.number().int().positive().max(1200).optional(),
});

const createVideoSchema = z.object({
  prompt: z.string().trim().min(10).max(4000),
  size: videoSizeSchema.optional(),
  seconds: z.coerce.number().int().positive().max(20).optional(),
  model: z.string().trim().min(1).max(100).optional(),
});

const videoIdParamSchema = z.object({
  videoId: z.string().trim().min(1).max(200),
});

const videoEmailSnippetSchema = z.object({
  landingUrl: z.string().trim().url(),
  thumbnailUrl: z.string().trim().url().optional(),
  altText: z.string().trim().max(255).optional(),
  emailWidth: z.coerce.number().int().positive().max(1200).optional(),
});

router.use(auth);

router.post(
  "/images",
  validate({ body: generateImageSchema }),
  aiMediaController.generateImage,
);
router.post(
  "/videos",
  validate({ body: createVideoSchema }),
  aiMediaController.createVideoJob,
);
router.get(
  "/videos/:videoId",
  validate({ params: videoIdParamSchema }),
  aiMediaController.getVideoStatus,
);
router.post(
  "/videos/:videoId/download",
  validate({ params: videoIdParamSchema }),
  aiMediaController.downloadCompletedVideo,
);
router.post(
  "/video-email-snippet",
  validate({ body: videoEmailSnippetSchema }),
  aiMediaController.buildVideoEmailSnippet,
);

module.exports = router;
