const ApiError = require("../../common/ApiError");
const trackingRepository = require("./tracking.repository");
const { verifyTrackingToken } = require("./trackingToken");

const normalizeMetadata = (metadataOrReq) => {
  if (!metadataOrReq) {
    return { ipAddress: null, userAgent: null };
  }
  if (typeof metadataOrReq.get === "function") {
    return {
      ipAddress: metadataOrReq.ip || null,
      userAgent: metadataOrReq.get("user-agent") || null,
    };
  }
  return {
    ipAddress: metadataOrReq.ipAddress || null,
    userAgent: metadataOrReq.userAgent || null,
  };
};

const decode = (token, action) => {
  try {
    return verifyTrackingToken(token, action);
  } catch (_error) {
    throw new ApiError(404, "Tracking link not found");
  }
};

const recordOpen = async (token, metadata) => {
  const payload = decode(token, "open");
  const meta = normalizeMetadata(metadata);
  if (payload.individualEmailId) {
    await trackingRepository.recordIndividualOpen(
      payload.individualEmailId,
      meta,
    );
    return;
  }
  await trackingRepository.recordOpen(payload.recipientId, meta);
};

const getClickDestination = async (token, metadata) => {
  const payload = decode(token, "click");
  if (!payload.url || !/^https?:\/\//i.test(payload.url)) {
    throw new ApiError(404, "Tracking link not found");
  }

  const meta = normalizeMetadata(metadata);
  const found = payload.individualEmailId
    ? await trackingRepository.recordIndividualClick(
        payload.individualEmailId,
        payload.url,
        meta,
      )
    : await trackingRepository.recordClick(
        payload.recipientId,
        payload.url,
        meta,
      );
  if (!found) {
    throw new ApiError(404, "Tracking link not found");
  }

  return payload.url;
};

const getUnsubscribeContext = async (token) => {
  const payload = decode(token, "unsubscribe");
  const context = payload.individualEmailId
    ? await trackingRepository.findIndividualEmailContext(
        payload.individualEmailId,
      )
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

const unsubscribe = async (token, metadata) => {
  const payload = decode(token, "unsubscribe");
  const meta = normalizeMetadata(metadata);
  const found = payload.individualEmailId
    ? await trackingRepository.unsubscribeIndividual(
        payload.individualEmailId,
        meta,
      )
    : await trackingRepository.unsubscribe(payload.recipientId, meta);
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
