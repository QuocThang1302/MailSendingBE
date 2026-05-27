const ApiError = require("../../common/ApiError");
const trackingRepository = require("./tracking.repository");
const { verifyTrackingToken } = require("./trackingToken");

const getMetadata = (req) => ({
  ipAddress: req.ip || null,
  userAgent: req.get("user-agent") || null,
});

const decode = (token, action) => {
  try {
    return verifyTrackingToken(token, action);
  } catch (_error) {
    throw new ApiError(404, "Tracking link not found");
  }
};

const recordOpen = async (token, req) => {
  const payload = decode(token, "open");
  if (payload.individualEmailId) {
    await trackingRepository.recordIndividualOpen(
      payload.individualEmailId,
      getMetadata(req),
    );
    return;
  }
  await trackingRepository.recordOpen(payload.recipientId, getMetadata(req));
};

const getClickDestination = async (token, req) => {
  const payload = decode(token, "click");
  if (!payload.url || !/^https?:\/\//i.test(payload.url)) {
    throw new ApiError(404, "Tracking link not found");
  }

  const found = payload.individualEmailId
    ? await trackingRepository.recordIndividualClick(
        payload.individualEmailId,
        payload.url,
        getMetadata(req),
      )
    : await trackingRepository.recordClick(
        payload.recipientId,
        payload.url,
        getMetadata(req),
      );
  if (!found) {
    throw new ApiError(404, "Tracking link not found");
  }

  return payload.url;
};

const getUnsubscribeContext = async (token) => {
  const payload = decode(token, "unsubscribe");
  const context = payload.individualEmailId
    ? await trackingRepository.findIndividualEmailContext(payload.individualEmailId)
    : await trackingRepository.findRecipientContext(payload.recipientId);
  if (!context) {
    throw new ApiError(404, "Unsubscribe link not found");
  }
  const recipient = payload.individualEmailId ? context : context.recipient;
  return {
    token,
    email: recipient.email,
    alreadyUnsubscribed: recipient.status === "unsubscribed",
  };
};

const unsubscribe = async (token, req) => {
  const payload = decode(token, "unsubscribe");
  const found = payload.individualEmailId
    ? await trackingRepository.unsubscribeIndividual(
        payload.individualEmailId,
        getMetadata(req),
      )
    : await trackingRepository.unsubscribe(payload.recipientId, getMetadata(req));
  if (!found) {
    throw new ApiError(404, "Unsubscribe link not found");
  }
};

module.exports = {
  recordOpen,
  getClickDestination,
  getUnsubscribeContext,
  unsubscribe,
};
