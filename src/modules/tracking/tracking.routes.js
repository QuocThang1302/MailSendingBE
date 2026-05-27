const { Router } = require("express");
const trackingController = require("./tracking.controller");

const router = Router();

router.get("/open/:token.gif", trackingController.open);
router.get("/click/:token", trackingController.click);
router.get("/unsubscribe/:token", trackingController.unsubscribePage);
router.post("/unsubscribe/:token", trackingController.unsubscribe);

module.exports = router;
