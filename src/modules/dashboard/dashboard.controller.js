const asyncHandler = require("../../common/asyncHandler");
const { sendOk } = require("../../common/http");
const dashboardService = require("./dashboard.service");

const getOverview = asyncHandler(async (req, res) => {
  const data = await dashboardService.getOverview(req.user.id);
  return sendOk(res, data, "Fetched dashboard overview");
});

module.exports = {
  getOverview,
};
