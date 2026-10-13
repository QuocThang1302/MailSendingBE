const { z } = require("zod");

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const recipientParamSchema = idParamSchema.extend({
  recipientId: z.coerce.number().int().positive(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().trim().max(50).optional(),
  userId: z.coerce.number().int().positive().optional(),
});

const createCampaignSchema = z.object({
  campaignName: z.string().trim().min(1).max(200),
  templateId: z.number().int().positive(),
  emailAccountId: z.number().int().positive(),
  segmentId: z.number().int().positive().optional(),
  campaignType: z.enum(["regular", "ab_test", "automated"]).optional(),
  scheduledTime: z.string().datetime().optional(),
  contactIds: z.array(z.number().int().positive()).max(50000).optional(),
  recipientEmails: z.array(z.string().email().max(150)).max(50000).optional(),
});

const updateCampaignSchema = z.object({
  campaignName: z.string().trim().min(1).max(200).optional(),
  templateId: z.number().int().positive().optional(),
  emailAccountId: z.number().int().positive().optional(),
  segmentId: z.number().int().positive().nullable().optional(),
  campaignType: z.enum(["regular", "ab_test", "automated"]).optional(),
  scheduledTime: z.string().datetime().nullable().optional(),
  contactIds: z.array(z.number().int().positive()).max(50000).optional(),
  recipientEmails: z.array(z.string().email().max(150)).max(50000).optional(),
});

const campaignRecipientSchema = z.object({
  email: z.string().trim().email().max(150),
});

module.exports = {
  idParamSchema,
  recipientParamSchema,
  listQuerySchema,
  createCampaignSchema,
  updateCampaignSchema,
  campaignRecipientSchema,
};
