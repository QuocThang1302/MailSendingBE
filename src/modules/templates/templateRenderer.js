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

  if (type === "section" || type === "container" || type === "column") {
    return `<div style="padding: 8px 0;">${childrenHtml}</div>`;
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
    const styleWidth =
      Number.isFinite(width) && width > 0
        ? `max-width: ${width}px;`
        : "max-width: 100%;";
    if (!src) {
      return "";
    }
    return `<img src="${src}" alt="${alt}" style="display: block; ${styleWidth} height: auto; margin: 0 0 12px;" />`;
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
      const candidate = readText(
        props,
        ["text", "content", "label", "alt"],
        "",
      ).trim();
      if (candidate) {
        acc.push(candidate);
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
  const blocks = toArray(layout?.blocks);
  const body = blocks.map(renderBlock).join("\n");

  const html = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width,initial-scale=1" />',
    "  <title>Email</title>",
    "</head>",
    '<body style="margin:0;padding:24px;background:#f9fafb;font-family:Arial,sans-serif;color:#111827;">',
    '  <div style="max-width:640px;margin:0 auto;background:#ffffff;padding:24px;border-radius:8px;">',
    body,
    "  </div>",
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
