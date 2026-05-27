const nodemailer = require("nodemailer");
const { buildTrackingUrl } = require("../tracking/trackingToken");

const transporterCache = new Map();

const normalizePort = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
};

const htmlToText = (value) => {
  if (!value) {
    return "";
  }

  return String(value)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};

const getContactTokens = (contact, additionalTokens = {}) => {
  const firstName = contact.first_name || "";
  const lastName = contact.last_name || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return {
    email: contact.email || "",
    first_name: firstName,
    firstName,
    last_name: lastName,
    lastName,
    full_name: fullName,
    fullName,
    phone: contact.phone || "",
    company: contact.company || "",
    city: contact.city || "",
    country: contact.country || "",
    language: contact.language || "",
    source: contact.source || "",
    ...additionalTokens,
  };
};

const replacePlaceholders = (value, contact, additionalTokens) => {
  if (value === null || value === undefined) {
    return "";
  }

  const tokens = getContactTokens(contact, additionalTokens);

  return String(value).replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => {
    if (tokens[key] === undefined || tokens[key] === null) {
      return "";
    }
    return String(tokens[key]);
  });
};

const injectPreviewText = (html, previewText) => {
  if (!previewText) {
    return html;
  }

  const hiddenPreview =
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">' +
    String(previewText) +
    "</div>";

  if (html.includes("<body")) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${hiddenPreview}`);
  }

  return `${hiddenPreview}${html}`;
};

const decodeHref = (value) => {
  return String(value)
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
};

const rewriteTrackedLinks = (html, recipientId, unsubscribeUrl) => {
  if (!recipientId || !html) {
    return html;
  }

  return String(html).replace(
    /(<a\b[^>]*\bhref\s*=\s*)(["'])([^"']+)\2/gi,
    (match, prefix, quote, rawUrl) => {
      const targetUrl = decodeHref(rawUrl).trim();
      if (
        !/^https?:\/\//i.test(targetUrl) ||
        targetUrl === unsubscribeUrl
      ) {
        return match;
      }

      const trackedUrl = buildTrackingUrl("click", recipientId, {
        url: targetUrl,
      });
      return trackedUrl ? `${prefix}${quote}${trackedUrl}${quote}` : match;
    },
  );
};

const injectTrackingPixel = (html, recipientId) => {
  const pixelUrl = buildTrackingUrl("open", recipientId);
  if (!pixelUrl || !html) {
    return html;
  }

  const pixel =
    `<img src="${pixelUrl}" width="1" height="1" alt="" ` +
    'style="display:none;width:1px;height:1px;border:0;" />';

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${pixel}</body>`);
  }
  return `${html}${pixel}`;
};

const buildTransporterConfig = (account) => {
  const port = normalizePort(account.smtp_port);
  const secure = port === 465;
  const auth =
    account.smtp_username || account.smtp_password
      ? {
          user: account.smtp_username || "",
          pass: account.smtp_password || "",
        }
      : undefined;

  return {
    host: account.smtp_host,
    port,
    secure,
    requireTLS: Boolean(account.use_tls) && !secure,
    auth,
  };
};

const getTransporter = (account) => {
  const cacheKey = JSON.stringify({
    host: account.smtp_host,
    port: normalizePort(account.smtp_port),
    username: account.smtp_username || "",
    secure: normalizePort(account.smtp_port) === 465,
    useTls: Boolean(account.use_tls),
  });

  if (!transporterCache.has(cacheKey)) {
    transporterCache.set(
      cacheKey,
      nodemailer.createTransport(buildTransporterConfig(account)),
    );
  }

  return transporterCache.get(cacheKey);
};

const validateSmtpAccount = (account) => {
  if (!account) {
    throw new Error("EMAIL_ACCOUNT_NOT_FOUND");
  }

  if (account.status && account.status !== "active") {
    throw new Error("EMAIL_ACCOUNT_INACTIVE");
  }

  if (!account.smtp_host) {
    throw new Error("SMTP_HOST_REQUIRED");
  }

  if (!account.email_address) {
    throw new Error("SMTP_FROM_ADDRESS_REQUIRED");
  }
};

const buildFromAddress = (account) => {
  const address = account.email_address;
  const name = account.display_name ? String(account.display_name).trim() : "";
  return name ? `"${name.replace(/"/g, '\\"')}" <${address}>` : address;
};

const renderCampaignEmail = (template, contact, options = {}) => {
  const tokens = options.tokens || {};
  const subject = replacePlaceholders(
    template.subject || "",
    contact,
    tokens,
  ).trim();
  const previewText = replacePlaceholders(
    template.preview_text || "",
    contact,
    tokens,
  );
  const htmlBody = replacePlaceholders(template.content_html || "", contact, tokens);
  const textBody = replacePlaceholders(
    template.content_text || htmlToText(htmlBody),
    contact,
    tokens,
  );

  return {
    subject,
    html: injectPreviewText(htmlBody, previewText),
    text: textBody,
  };
};

const sendCampaignEmail = async ({
  account,
  template,
  contact,
  recipientId,
  recipientEmail,
}) => {
  validateSmtpAccount(account);
  const transporter = getTransporter(account);
  const unsubscribeUrl = buildTrackingUrl("unsubscribe", recipientId);
  const baseRendered = renderCampaignEmail(template, contact, {
    tokens: {
      unsubscribe_url: unsubscribeUrl || "",
    },
  });
  const rendered = {
    ...baseRendered,
    html: injectTrackingPixel(
      rewriteTrackedLinks(baseRendered.html, recipientId, unsubscribeUrl),
      recipientId,
    ),
  };

  const info = await transporter.sendMail({
    from: buildFromAddress(account),
    to: recipientEmail,
    subject: rendered.subject || "(No subject)",
    html: rendered.html,
    text: rendered.text,
    ...(unsubscribeUrl
      ? {
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }
      : {}),
  });

  return {
    rendered,
    messageId: info.messageId || null,
    response: info.response || null,
  };
};

const sendTestEmail = async ({
  account,
  toEmail,
  subject,
  text,
  html,
}) => {
  validateSmtpAccount(account);
  const transporter = getTransporter(account);

  const info = await transporter.sendMail({
    from: buildFromAddress(account),
    to: toEmail || account.email_address,
    subject: subject || "SMTP test email",
    text: text || "SMTP test email sent successfully.",
    html:
      html ||
      "<p>SMTP test email sent successfully.</p><p>Your email account is configured correctly.</p>",
  });

  return {
    messageId: info.messageId || null,
    response: info.response || null,
  };
};

module.exports = {
  renderCampaignEmail,
  sendTestEmail,
  sendCampaignEmail,
};
