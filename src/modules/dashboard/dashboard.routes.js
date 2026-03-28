const { Router } = require("express");

const auth = require("../../middlewares/auth");
const dashboardController = require("./dashboard.controller");

const router = Router();

router.use(auth);
router.get("/overview", dashboardController.getOverview);

module.exports = router;
