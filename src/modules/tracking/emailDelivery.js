const env = require("../../config/env");

const TRACK_MARKER_REGEX =
  /\sdata-(?:track-click|mail-track-click)(?:\s*=\s*(?:"true"|'true'|true))?/i;

const escapeAttribute = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const decodeHref = (value) =>
  String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

const stripClickTrackingMarkers = (attrs) =>
  String(attrs || "").replace(TRACK_MARKER_REGEX, "");

const shouldTrackClick = (attrs) => {
  if (env.emailClickTrackingMode === "none") {
    return false;
  }
  if (env.emailClickTrackingMode === "all") {
    return true;
  }
  return TRACK_MARKER_REGEX.test(String(attrs || ""));
};

const isTrackableUrl = (targetUrl, unsubscribeUrl) => {
  if (!/^https?:\/\//i.test(targetUrl)) {
    return false;
  }
  if (unsubscribeUrl && targetUrl === unsubscribeUrl) {
    return false;
  }
  return !/\/api\/v1\/tracking\//i.test(targetUrl);
};

const rewriteTrackedLinks = ({
  html,
  entityId,
  unsubscribeUrl,
  buildClickUrl,
}) => {
  if (!entityId || !html || typeof buildClickUrl !== "function") {
    return html;
  }

  return String(html).replace(
    /<a\b([^>]*)\bhref\s*=\s*(["'])([^"']*)\2([^>]*)>/gi,
    (match, beforeHref, quote, rawUrl, afterHref) => {
      const attrs = `${beforeHref || ""}${afterHref || ""}`;
      const cleanBeforeHref = stripClickTrackingMarkers(beforeHref);
      const cleanAfterHref = stripClickTrackingMarkers(afterHref);
      const targetUrl = decodeHref(rawUrl).trim();

      if (!shouldTrackClick(attrs) || !isTrackableUrl(targetUrl, unsubscribeUrl)) {
        return `<a${cleanBeforeHref} href=${quote}${rawUrl}${quote}${cleanAfterHref}>`;
      }

      const trackedUrl = buildClickUrl(entityId, targetUrl);
      if (!trackedUrl) {
        return match;
      }

      return `<a${cleanBeforeHref} href=${quote}${escapeAttribute(
        trackedUrl,
      )}${quote}${cleanAfterHref}>`;
    },
  );
};

const injectTrackingPixel = ({ html, entityId, buildOpenUrl }) => {
  if (!env.emailOpenTrackingEnabled || !entityId || !html) {
    return html;
  }

  const pixelUrl =
    typeof buildOpenUrl === "function" ? buildOpenUrl(entityId) : null;
  if (!pixelUrl) {
    return html;
  }

  const pixel =
    `<img src="${escapeAttribute(pixelUrl)}" width="1" height="1" alt="" ` +
    'style="display:none;width:1px;height:1px;border:0;" />';

  return /<\/body>/i.test(html)
    ? String(html).replace(/<\/body>/i, `${pixel}</body>`)
    : `${html}${pixel}`;
};

const ensureVisibleUnsubscribe = ({ html, text, unsubscribeUrl }) => {
  if (!env.emailAppendUnsubscribeFooter || !unsubscribeUrl) {
    return { html, text };
  }

  let nextHtml = html;
  let nextText = text;

  if (nextHtml && !String(nextHtml).includes(unsubscribeUrl)) {
    const footer =
      '<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;' +
      'font-family:Arial,sans-serif;font-size:12px;line-height:18px;color:#6b7280;">' +
      `If you no longer want to receive these emails, <a href="${escapeAttribute(
        unsubscribeUrl,
      )}" style="color:#2563eb;text-decoration:underline;">unsubscribe here</a>.` +
      "</div>";

    nextHtml = /<\/body>/i.test(nextHtml)
      ? String(nextHtml).replace(/<\/body>/i, `${footer}</body>`)
      : `${nextHtml}${footer}`;
  }

  if (nextText && !String(nextText).includes(unsubscribeUrl)) {
    nextText = `${String(nextText).trim()}\n\nUnsubscribe: ${unsubscribeUrl}`;
  }

  return { html: nextHtml, text: nextText };
};

const buildListUnsubscribeHeaders = (unsubscribeUrl) => {
  if (!unsubscribeUrl) {
    return {};
  }

  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
};

module.exports = {
  buildListUnsubscribeHeaders,
  ensureVisibleUnsubscribe,
  injectTrackingPixel,
  rewriteTrackedLinks,
};
