const { Router } = require("express");

const authRoutes = require("../modules/auth/auth.routes");
const contactRoutes = require("../modules/contacts/contacts.routes");
const templateRoutes = require("../modules/templates/templates.routes");
const emailAccountRoutes = require("../modules/emailAccounts/emailAccounts.routes");
const campaignRoutes = require("../modules/campaigns/campaigns.routes");
const dashboardRoutes = require("../modules/dashboard/dashboard.routes");

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

module.exports = router;
