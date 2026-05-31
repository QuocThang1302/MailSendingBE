const { Router } = require("express");

const authRoutes = require("../modules/auth/auth.routes");
const contactRoutes = require("../modules/contacts/contacts.routes");
const templateRoutes = require("../modules/templates/templates.routes");
const emailAccountRoutes = require("../modules/emailAccounts/emailAccounts.routes");
const campaignRoutes = require("../modules/campaigns/campaigns.routes");
const dashboardRoutes = require("../modules/dashboard/dashboard.routes");
const individualEmailRoutes = require("../modules/individualEmails/individualEmails.routes");
const aiMediaRoutes = require("../modules/aiMedia/aiMedia.routes");
const adminRoutes = require("../modules/admin/admin.routes");
const trackingRoutes = require("../modules/tracking/tracking.routes");

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

router.use("/auth", authRoutes);
router.use("/contacts", contactRoutes);
router.use("/templates", templateRoutes);
router.use("/email-accounts", emailAccountRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/individual-emails", individualEmailRoutes);
router.use("/ai-media", aiMediaRoutes);
router.use("/admin", adminRoutes);
router.use("/tracking", trackingRoutes);

module.exports = router;
