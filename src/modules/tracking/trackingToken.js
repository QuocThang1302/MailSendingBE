const crypto = require("crypto");
const env = require("../../config/env");

const getTrackingBaseUrl = () => {
  const publicBaseUrl = String(env.publicBaseUrl || "").replace(/\/+$/, "");
  return publicBaseUrl ? `${publicBaseUrl}/api/v1/tracking` : null;
};

const sign = (encodedPayload) => {
  return crypto
    .createHmac("sha256", env.trackingSecret)
    .update(encodedPayload)
    .digest("base64url");
};

const createTrackingToken = (payload) => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  return `${encodedPayload}.${sign(encodedPayload)}`;
};

const verifyTrackingToken = (token, expectedAction) => {
  const [encodedPayload, providedSignature] = String(token || "").split(".");
  if (!encodedPayload || !providedSignature) {
    throw new Error("INVALID_TRACKING_TOKEN");
  }

  const expectedSignature = sign(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error("INVALID_TRACKING_TOKEN");
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString());
  } catch (_error) {
    throw new Error("INVALID_TRACKING_TOKEN");
  }

  const isCampaignRecipient =
    Number.isInteger(payload.recipientId) && payload.recipientId > 0;
  const isIndividualEmail =
    Number.isInteger(payload.individualEmailId) && payload.individualEmailId > 0;

  if (
    payload.action !== expectedAction ||
    (isCampaignRecipient === isIndividualEmail)
  ) {
    throw new Error("INVALID_TRACKING_TOKEN");
  }

  return payload;
};

const buildTrackingUrl = (action, recipientId, additionalPayload = {}) => {
  const baseUrl = getTrackingBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const token = createTrackingToken({
    recipientId,
    action,
    ...additionalPayload,
  });

  if (action === "open") {
    return `${baseUrl}/open/${token}.gif`;
  }
  return `${baseUrl}/${action}/${token}`;
};

const buildIndividualTrackingUrl = (
  action,
  individualEmailId,
  additionalPayload = {},
) => {
  const baseUrl = getTrackingBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const token = createTrackingToken({
    individualEmailId,
    action,
    ...additionalPayload,
  });

  if (action === "open") {
    return `${baseUrl}/open/${token}.gif`;
  }
  return `${baseUrl}/${action}/${token}`;
};

module.exports = {
  buildTrackingUrl,
  buildIndividualTrackingUrl,
  verifyTrackingToken,
};
