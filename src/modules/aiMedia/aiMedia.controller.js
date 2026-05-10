const asyncHandler = require("../../common/asyncHandler");
const { sendOk } = require("../../common/http");
const aiMediaService = require("./aiMedia.service");

const generateImage = asyncHandler(async (req, res) => {
  const data = await aiMediaService.generateImage(req.body);
  return sendOk(res, data, "Generated image", 201);
});

const createVideoJob = asyncHandler(async (req, res) => {
  const data = await aiMediaService.createVideoJob(req.body);
  return sendOk(res, data, "Created video job", 202);
});

const getVideoStatus = asyncHandler(async (req, res) => {
  const data = await aiMediaService.getVideoStatus(req.params.videoId);
  return sendOk(res, data, "Fetched video status");
});

const downloadCompletedVideo = asyncHandler(async (req, res) => {
  const data = await aiMediaService.downloadCompletedVideo(req.params.videoId);
  return sendOk(res, data, "Downloaded video when ready");
});

const buildVideoEmailSnippet = asyncHandler(async (req, res) => {
  const data = aiMediaService.buildVideoEmailSnippet(req.body);
  return sendOk(res, data, "Built video email snippet");
});

module.exports = {
  generateImage,
  createVideoJob,
  getVideoStatus,
  downloadCompletedVideo,
  buildVideoEmailSnippet,
};
