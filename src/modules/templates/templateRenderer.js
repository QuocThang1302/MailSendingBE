const escapeHtml = (value) => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const escapeAttribute = (value) => {
  return escapeHtml(value).replace(/`/g, "");
};

const toArray = (value) => {
  return Array.isArray(value) ? value : [];
};

const toSafeNumber = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
};

const normalizeUrl = (value) => {
  if (!value) {
    return "#";
  }

  const text = String(value).trim();
  if (text.startsWith("http://") || text.startsWith("https://")) {
    return text;
  }
  if (text.startsWith("mailto:")) {
    return text;
  }
  return "#";
};

const readColor = (props, keys, fallback) => {
  const value = readText(props, keys, fallback).trim();
  if (/^#[0-9a-f]{3,8}$/i.test(value)) {
    return value;
  }
  if (/^(rgb|rgba)\(/i.test(value)) {
    return value;
  }
  return fallback;
};

const renderChildren = (children) => {
  return toArray(children).map(renderBlock).join("\n");
};

const readText = (props, keys, fallback = "") => {
  for (const key of keys) {
    if (props[key] !== undefined && props[key] !== null) {
      return String(props[key]);
    }
  }
  return fallback;
};

const clampQrSize = (value) => {
  const size = Number.parseInt(value, 10);
  if (!Number.isFinite(size)) {
    return 220;
  }
  return Math.max(96, Math.min(480, size));
};

const buildQrPreviewSrc = (rawValue, size) => {
  const base = "https://api.qrserver.com/v1/create-qr-code/";
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    data: String(rawValue || ""),
  });
  return `${base}?${params.toString()}`;
};

const renderBlock = (block) => {
  if (!block || typeof block !== "object") {
    return "";
  }

  const type = String(block.type || "").toLowerCase();
  const props =
    block.props && typeof block.props === "object" ? block.props : {};
  const childrenHtml = renderChildren(block.children);

  if (type === "section" || type === "container") {
    const padding = toSafeNumber(props.padding, 8, 0, 80);
    const background = readColor(props, ["background", "backgroundColor"], "transparent");
    const align = escapeAttribute(readText(props, ["align"], "left"));
    return [
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:${background};">`,
      "  <tr>",
      `    <td style="padding:${padding}px 0;text-align:${align};">`,
      childrenHtml,
      "    </td>",
      "  </tr>",
      "</table>",
    ].join("\n");
  }

  if (type === "column") {
    return childrenHtml;
  }

  if (type === "columns" || type === "grid") {
    const columns = toArray(block.children);
    const gap = toSafeNumber(props.gap, 24, 0, 48);
    const columnsPerRow = toSafeNumber(
      props.columns || props.columnsPerRow,
      2,
      1,
      4,
    );
    const rows = [];

    for (let index = 0; index < columns.length; index += columnsPerRow) {
      const rowItems = columns.slice(index, index + columnsPerRow);
      const cells = rowItems
        .map((column, columnIndex) => {
          const width = Math.floor(100 / columnsPerRow);
          const paddingLeft = columnIndex === 0 ? 0 : Math.floor(gap / 2);
          const paddingRight =
            columnIndex === rowItems.length - 1 ? 0 : Math.ceil(gap / 2);
          return [
            `<td class="email-stack" width="${width}%" valign="top" style="width:${width}%;padding:0 ${paddingRight}px ${gap}px ${paddingLeft}px;">`,
            renderBlock(column),
            "</td>",
          ].join("\n");
        })
        .join("\n");

      rows.push(`<tr>${cells}</tr>`);
    }

    return [
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">',
      rows.join("\n"),
      "</table>",
    ].join("\n");
  }

  if (type === "heading") {
    const level = Math.max(
      1,
      Math.min(6, Number.parseInt(props.level, 10) || 2),
    );
    const text = escapeHtml(readText(props, ["text", "content", "label"]));
    const align = escapeAttribute(readText(props, ["align"], "left"));
    return `<h${level} style="margin: 0 0 12px; text-align: ${align};">${text}</h${level}>`;
  }

  if (type === "text" || type === "paragraph") {
    const text = escapeHtml(
      readText(props, ["text", "content", "label"]),
    ).replace(/\n/g, "<br />");
    return `<p style="margin: 0 0 12px; line-height: 1.5;">${text}</p>`;
  }

  if (type === "image") {
    const src = escapeAttribute(readText(props, ["src", "url"]));
    const alt = escapeAttribute(readText(props, ["alt", "title"], "image"));
    const width = Number.parseInt(props.width, 10);
    const radius = toSafeNumber(props.radius ?? props.borderRadius, 0, 0, 32);
    const styleWidth =
      Number.isFinite(width) && width > 0
        ? `max-width: ${width}px;`
        : "max-width: 100%;";
    if (!src) {
      return "";
    }
    return `<img src="${src}" alt="${alt}" style="display: block; width: 100%; ${styleWidth} height: auto; margin: 0 0 12px; border: 0; border-radius: ${radius}px;" />`;
  }

  if (type === "qrcode" || type === "qr") {
    const rawValue = readText(props, ["value", "content", "data"], "");
    const title = escapeHtml(readText(props, ["title"], "QR Code"));
    const caption = escapeHtml(readText(props, ["caption"], ""));
    const size = clampQrSize(props.size);
    const previewSrc = escapeAttribute(buildQrPreviewSrc(rawValue, size));
    const valueAttribute = escapeAttribute(rawValue);

    if (!rawValue.trim()) {
      return "";
    }

    const captionHtml = caption
      ? `<div style="margin-top: 10px; color: #64748b; font-size: 13px;">${caption}</div>`
      : "";

    return [
      '<div style="margin: 0 0 16px;">',
      `  <div style="border: 1px solid #dbeafe; border-radius: 16px; background: #f8fbff; padding: 18px; text-align: center;">`,
      `    <div style="margin-bottom: 10px; color: #334155; font-size: 18px; font-weight: 700;">${title}</div>`,
      `    <img src="${previewSrc}" alt="QR code" width="${size}" height="${size}" data-mail-qr="true" data-qr-value="${valueAttribute}" data-qr-size="${size}" style="display: block; width: ${size}px; height: ${size}px; max-width: 100%; margin: 0 auto;" />`,
      `    ${captionHtml}`,
      "  </div>",
      "</div>",
    ].join("\n");
  }

  if (type === "button") {
    const label = escapeHtml(readText(props, ["text", "label"], "Click"));
    const href = escapeAttribute(
      normalizeUrl(readText(props, ["url", "href"], "#")),
    );
    return `<div style="margin: 0 0 12px;"><a href="${href}" style="display: inline-block; padding: 10px 18px; background: #1f2937; color: #ffffff; text-decoration: none; border-radius: 6px;">${label}</a></div>`;
  }

  if (type === "link" || type === "cta") {
    const label = escapeHtml(readText(props, ["text", "label"], "Learn more"));
    const href = escapeAttribute(
      normalizeUrl(readText(props, ["url", "href"], "#")),
    );
    const color = readColor(props, ["color"], "#0b57d0");
    return `<a href="${href}" style="color:${color};font-size:16px;line-height:24px;text-decoration:none;">${label}</a>`;
  }

  if (type === "featurecard" || type === "feature-card") {
    const imageUrl = escapeAttribute(readText(props, ["imageUrl", "image", "src", "url"]));
    const imageAlt = escapeAttribute(readText(props, ["imageAlt", "alt", "title"], ""));
    const title = escapeHtml(readText(props, ["title", "heading"], ""));
    const description = escapeHtml(
      readText(props, ["description", "body", "text", "content"], ""),
    ).replace(/\n/g, "<br />");
    const linkLabel = escapeHtml(
      readText(props, ["linkLabel", "linkText", "ctaLabel", "label"], ""),
    );
    const linkUrl = escapeAttribute(
      normalizeUrl(readText(props, ["linkUrl", "href", "ctaUrl"], "#")),
    );
    const imageRadius = toSafeNumber(props.imageRadius ?? props.radius, 18, 0, 32);
    const imageHtml = imageUrl
      ? `<img src="${imageUrl}" width="100%" alt="${imageAlt}" style="display:block;width:100%;height:auto;border:0;border-radius:${imageRadius}px;margin:0 0 24px;" />`
      : "";
    const titleHtml = title
      ? `<h2 style="margin:0 0 8px;color:#202124;font-size:22px;line-height:30px;font-weight:400;">${title}</h2>`
      : "";
    const descriptionHtml = description
      ? `<p style="margin:0 0 16px;color:#5f6368;font-size:16px;line-height:24px;">${description}</p>`
      : "";
    const linkHtml = linkLabel
      ? `<a href="${linkUrl}" style="color:#0b57d0;font-size:16px;line-height:24px;text-decoration:none;">${linkLabel}</a>`
      : "";

    return [
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">',
      "  <tr>",
      `    <td style="padding:0 0 16px;">${imageHtml}${titleHtml}${descriptionHtml}${linkHtml}${childrenHtml}</td>`,
      "  </tr>",
      "</table>",
    ].join("\n");
  }

  if (type === "divider") {
    return '<hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 12px 0;" />';
  }

  if (type === "spacer") {
    const height = Number.parseInt(props.height, 10);
    const safeHeight = Number.isFinite(height) && height >= 0 ? height : 16;
    return `<div style="height: ${safeHeight}px;"></div>`;
  }

  if (type === "html") {
    return String(readText(props, ["html", "content"], ""));
  }

  const fallbackText = escapeHtml(
    readText(props, ["text", "content", "label"], ""),
  );
  if (fallbackText) {
    return `<div style="margin: 0 0 12px;">${fallbackText}</div>${childrenHtml}`;
  }

  return childrenHtml;
};

const collectText = (blocks) => {
  const walk = (items, acc) => {
    for (const item of toArray(items)) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const props =
        item.props && typeof item.props === "object" ? item.props : {};
      const textKeys = [
        "title",
        "heading",
        "text",
        "content",
        "description",
        "body",
        "label",
        "linkLabel",
        "linkText",
        "ctaLabel",
        "alt",
      ];

      for (const key of textKeys) {
        const candidate =
          props[key] === undefined || props[key] === null
            ? ""
            : String(props[key]).trim();
        if (candidate) {
          acc.push(candidate);
        }
      }

      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children, acc);
      }
    }
  };

  const lines = [];
  walk(blocks, lines);
  return lines.join("\n");
};

const renderTemplateLayout = (layout) => {
  const blocks = layout?.root ? [layout.root] : toArray(layout?.blocks);
  const body = blocks.map(renderBlock).join("\n");

  const html = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width,initial-scale=1" />',
    "  <title>Email</title>",
    "  <style>",
    "    @media only screen and (max-width: 640px) {",
    "      .email-wrapper { width: 100% !important; }",
    "      .email-stack { display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }",
    "    }",
    "  </style>",
    "</head>",
    '<body style="margin:0;padding:24px;background:#f9fafb;font-family:Arial,sans-serif;color:#111827;">',
    '  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">',
    "    <tr>",
    '      <td align="center">',
    '        <table role="presentation" class="email-wrapper" width="720" cellpadding="0" cellspacing="0" style="width:720px;max-width:100%;border-collapse:collapse;background:#ffffff;">',
    "          <tr>",
    '            <td style="padding:28px;">',
    body,
    "            </td>",
    "          </tr>",
    "        </table>",
    "      </td>",
    "    </tr>",
    "  </table>",
    "</body>",
    "</html>",
  ].join("\n");

  const text = collectText(blocks);

  return {
    html,
    text,
  };
};

module.exports = {
  renderTemplateLayout,
};
