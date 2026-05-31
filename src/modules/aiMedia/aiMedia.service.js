const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const ApiError = require("../../common/ApiError");
const env = require("../../config/env");
const { supabase } = require("../../config/supabase");

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const POLLINATIONS_DEFAULT_IMAGE_SIZE = "1536x1024";
const GENERATED_MEDIA_DIR = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "public",
  "media",
  "generated",
);

const ensureNativeFetch = () => {
  if (typeof fetch !== "function") {
    throw new ApiError(500, "This server needs Node.js 18+ for native fetch");
  }
};

const ensureOpenAiConfigured = () => {
  ensureNativeFetch();
  if (!env.openaiApiKey) {
    throw new ApiError(500, "OPENAI_API_KEY is not configured");
  }
};

const getAiMediaProvider = () => {
  const provider = String(env.aiMediaProvider || "pollinations").toLowerCase();
  if (provider === "openai" || provider === "pollinations") {
    return provider;
  }
  throw new ApiError(
    500,
    "AI_MEDIA_PROVIDER must be either 'pollinations' or 'openai'",
  );
};

const openaiRequest = async (pathname, options = {}) => {
  ensureOpenAiConfigured();

  const headers = {
    Authorization: `Bearer ${env.openaiApiKey}`,
    ...(options.headers || {}),
  };

  const response = await fetch(`${OPENAI_BASE_URL}${pathname}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `OpenAI API request failed with status ${response.status}`;
    let details = null;

    try {
      details = await response.json();
      message = details?.error?.message || message;
    } catch (_error) {
      details = await response.text();
    }

    throw new ApiError(response.status >= 500 ? 502 : response.status, message, details);
  }

  return response;
};

const pollinationsRequest = async (pathname, options = {}) => {
  ensureNativeFetch();

  const baseUrl = String(env.pollinationsBaseUrl || "").replace(/\/+$/, "");
  const headers = {
    ...(env.pollinationsApiKey
      ? { Authorization: `Bearer ${env.pollinationsApiKey}` }
      : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Pollinations API request failed with status ${response.status}`;
    let details = null;

    try {
      details = await response.json();
      message = details?.error?.message || details?.message || message;
    } catch (_error) {
      details = await response.text();
      message = details || message;
    }

    throw new ApiError(response.status >= 500 ? 502 : response.status, message, details);
  }

  return response;
};

const ensureMediaDir = async () => {
  await fs.mkdir(GENERATED_MEDIA_DIR, { recursive: true });
};

const getMediaStorageProvider = () => {
  const provider = String(env.mediaStorageProvider || "local").toLowerCase();
  if (provider === "local" || provider === "supabase") {
    return provider;
  }
  throw new ApiError(
    500,
    "MEDIA_STORAGE_PROVIDER must be either 'local' or 'supabase'",
  );
};

const getMediaBaseUrl = () => {
  const baseUrl = env.mediaPublicBaseUrl || `${env.publicBaseUrl}/media`;
  return String(baseUrl || "").replace(/\/+$/, "");
};

const buildPublicUrl = (filename) => {
  const baseUrl = getMediaBaseUrl();
  if (!baseUrl) {
    return `/media/generated/${filename}`;
  }
  return `${baseUrl}/generated/${filename}`;
};

const getContentType = (extension) => {
  const normalized = String(extension || "").toLowerCase();
  if (normalized === "png") {
    return "image/png";
  }
  if (normalized === "webp") {
    return "image/webp";
  }
  if (normalized === "mp4") {
    return "video/mp4";
  }
  return "image/jpeg";
};

const buildStoragePath = (filename) => {
  const folder = String(env.supabaseStorageFolder || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  return folder ? `${folder}/${filename}` : filename;
};

const ensureSupabaseBucket = async () => {
  const bucket = env.supabaseStorageBucket;
  const { error: getError } = await supabase.storage.getBucket(bucket);

  if (!getError) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
  });

  if (
    createError &&
    !String(createError.message || "").includes("already exists")
  ) {
    throw new ApiError(
      500,
      `Could not prepare Supabase Storage bucket '${bucket}'`,
      createError,
    );
  }
};

const saveGeneratedFileToSupabase = async ({ buffer, extension, filename }) => {
  await ensureSupabaseBucket();

  const bucket = env.supabaseStorageBucket;
  const storagePath = buildStoragePath(filename);
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: getContentType(extension),
      upsert: false,
    });

  if (uploadError) {
    throw new ApiError(
      500,
      "Could not upload generated media to Supabase Storage",
      uploadError,
    );
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);

  if (!data?.publicUrl) {
    throw new ApiError(500, "Could not build Supabase Storage public URL");
  }

  return {
    filename,
    storagePath,
    url: data.publicUrl,
  };
};

const saveGeneratedFileToLocal = async ({ buffer, filename }) => {
  await ensureMediaDir();
  const filePath = path.join(GENERATED_MEDIA_DIR, filename);
  await fs.writeFile(filePath, buffer);
  return {
    filename,
    path: filePath,
    url: buildPublicUrl(filename),
  };
};

const saveGeneratedFile = async ({ buffer, extension }) => {
  const filename = `${new Date().toISOString().slice(0, 10)}-${randomUUID()}.${extension}`;

  if (getMediaStorageProvider() === "supabase") {
    return saveGeneratedFileToSupabase({ buffer, extension, filename });
  }

  return saveGeneratedFileToLocal({ buffer, filename });
};

const escapeHtml = (value) => {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const buildImageEmailHtml = ({ url, altText, width }) => {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 600;
  return `<img src="${escapeHtml(url)}" width="${safeWidth}" alt="${escapeHtml(
    altText || "Email image",
  )}" style="display:block;width:100%;max-width:${safeWidth}px;height:auto;border:0;" />`;
};

const buildVideoEmailHtml = ({ landingUrl, thumbnailUrl, altText, width }) => {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 600;
  const safeLandingUrl = escapeHtml(landingUrl || "#");
  const safeThumbnailUrl = escapeHtml(thumbnailUrl || "");

  if (!thumbnailUrl) {
    return `<a href="${safeLandingUrl}" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;">Xem video</a>`;
  }

  return `<a href="${safeLandingUrl}" style="display:block;text-decoration:none;"><img src="${safeThumbnailUrl}" width="${safeWidth}" alt="${escapeHtml(
    altText || "Xem video",
  )}" style="display:block;width:100%;max-width:${safeWidth}px;height:auto;border:0;" /></a>`;
};

const parseSize = (value, fallback) => {
  const [width, height] = String(value || fallback)
    .split("x")
    .map((part) => Number.parseInt(part, 10));

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return parseSize(fallback, "1024x1024");
  }

  return { width, height };
};

const getImageExtension = (contentType) => {
  const normalized = String(contentType || "").toLowerCase();
  if (normalized.includes("png")) {
    return "png";
  }
  if (normalized.includes("webp")) {
    return "webp";
  }
  return "jpg";
};

const buildPollinationsQuery = ({ model, size, seconds }) => {
  const params = new URLSearchParams();

  if (model) {
    params.set("model", model);
  }

  if (size && size !== "auto") {
    const { width, height } = parseSize(size, POLLINATIONS_DEFAULT_IMAGE_SIZE);
    params.set("width", String(width));
    params.set("height", String(height));
  }

  if (seconds) {
    params.set("duration", String(seconds));
  }

  params.set("nologo", "true");
  return params.toString();
};

const generateImageOpenAi = async (payload) => {
  const response = await openaiRequest("/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: payload.model || env.openaiImageModel,
      prompt: payload.prompt,
      size: payload.size || "1536x1024",
      n: 1,
    }),
  });

  const data = await response.json();
  const image = data?.data?.[0];
  const base64 = image?.b64_json || image?.b64;

  if (!base64) {
    throw new ApiError(502, "OpenAI did not return image data", data);
  }

  const saved = await saveGeneratedFile({
    buffer: Buffer.from(base64, "base64"),
    extension: "png",
  });

  return {
    type: "image",
    model: data.model || payload.model || env.openaiImageModel,
    prompt: payload.prompt,
    url: saved.url,
    filename: saved.filename,
    altText: payload.altText || "",
    emailHtml: buildImageEmailHtml({
      url: saved.url,
      altText: payload.altText,
      width: payload.emailWidth,
    }),
  };
};

const generateImagePollinations = async (payload) => {
  const model = payload.model || env.pollinationsImageModel;
  const query = buildPollinationsQuery({
    model,
    size: payload.size || POLLINATIONS_DEFAULT_IMAGE_SIZE,
  });
  const prompt = encodeURIComponent(payload.prompt);
  const response = await pollinationsRequest(`/image/${prompt}?${query}`, {
    headers: {
      Accept: "image/*",
    },
  });

  const arrayBuffer = await response.arrayBuffer();
  const saved = await saveGeneratedFile({
    buffer: Buffer.from(arrayBuffer),
    extension: getImageExtension(response.headers.get("content-type")),
  });

  return {
    type: "image",
    provider: "pollinations",
    model,
    prompt: payload.prompt,
    url: saved.url,
    filename: saved.filename,
    altText: payload.altText || "",
    emailHtml: buildImageEmailHtml({
      url: saved.url,
      altText: payload.altText,
      width: payload.emailWidth,
    }),
  };
};

const createVideoJobOpenAi = async (payload) => {
  if (typeof FormData !== "function") {
    throw new ApiError(500, "This server needs Node.js 18+ for native FormData");
  }

  const formData = new FormData();
  formData.set("model", payload.model || env.openaiVideoModel);
  formData.set("prompt", payload.prompt);

  if (payload.size) {
    formData.set("size", payload.size);
  }
  if (payload.seconds) {
    formData.set("seconds", String(payload.seconds));
  }

  const response = await openaiRequest("/videos", {
    method: "POST",
    body: formData,
  });

  const video = await response.json();
  return {
    id: video.id,
    status: video.status,
    progress: video.progress ?? null,
    model: video.model || payload.model || env.openaiVideoModel,
    seconds: video.seconds || payload.seconds || null,
    size: video.size || payload.size || null,
    prompt: payload.prompt,
  };
};

const createVideoJobPollinations = async (payload) => {
  const model = payload.model || env.pollinationsVideoModel;
  const query = buildPollinationsQuery({
    model,
    size: payload.size,
    seconds: payload.seconds,
  });
  const prompt = encodeURIComponent(payload.prompt);
  const response = await pollinationsRequest(`/video/${prompt}?${query}`, {
    headers: {
      Accept: "video/mp4",
    },
  });

  const arrayBuffer = await response.arrayBuffer();
  const saved = await saveGeneratedFile({
    buffer: Buffer.from(arrayBuffer),
    extension: "mp4",
  });

  return {
    id: saved.filename,
    status: "completed",
    progress: 100,
    provider: "pollinations",
    model: model || null,
    seconds: payload.seconds || null,
    size: payload.size || null,
    prompt: payload.prompt,
    ready: true,
    url: saved.url,
    filename: saved.filename,
    emailHtml: buildVideoEmailHtml({
      landingUrl: saved.url,
      thumbnailUrl: null,
    }),
  };
};

const getVideoStatusOpenAi = async (videoId) => {
  const response = await openaiRequest(`/videos/${encodeURIComponent(videoId)}`);
  return response.json();
};

const getVideoStatusPollinations = async (videoId) => {
  const safeFilename = path.basename(videoId);

  if (getMediaStorageProvider() === "supabase") {
    const bucket = env.supabaseStorageBucket;
    const storagePath = buildStoragePath(safeFilename);
    const { error } = await supabase.storage.from(bucket).download(storagePath);

    if (error) {
      throw new ApiError(404, "Generated Pollinations video was not found");
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    return {
      id: safeFilename,
      status: "completed",
      progress: 100,
      ready: true,
      url: data.publicUrl,
      filename: safeFilename,
      storagePath,
    };
  }

  const filePath = path.join(GENERATED_MEDIA_DIR, safeFilename);

  try {
    await fs.access(filePath);
  } catch (_error) {
    throw new ApiError(404, "Generated Pollinations video was not found");
  }

  return {
    id: safeFilename,
    status: "completed",
    progress: 100,
    ready: true,
    url: buildPublicUrl(safeFilename),
    filename: safeFilename,
  };
};

const downloadCompletedVideoOpenAi = async (videoId) => {
  const status = await getVideoStatusOpenAi(videoId);
  if (status.status !== "completed") {
    return {
      id: status.id || videoId,
      status: status.status,
      progress: status.progress ?? null,
      ready: false,
    };
  }

  const response = await openaiRequest(
    `/videos/${encodeURIComponent(videoId)}/content`,
  );
  const arrayBuffer = await response.arrayBuffer();
  const saved = await saveGeneratedFile({
    buffer: Buffer.from(arrayBuffer),
    extension: "mp4",
  });

  return {
    id: status.id || videoId,
    status: status.status,
    progress: status.progress ?? 100,
    ready: true,
    url: saved.url,
    filename: saved.filename,
    emailHtml: buildVideoEmailHtml({
      landingUrl: saved.url,
      thumbnailUrl: null,
    }),
  };
};

const downloadCompletedVideoPollinations = async (videoId) => {
  const status = await getVideoStatusPollinations(videoId);

  return {
    ...status,
    emailHtml: buildVideoEmailHtml({
      landingUrl: status.url,
      thumbnailUrl: null,
    }),
  };
};

const generateImage = async (payload) => {
  if (getAiMediaProvider() === "openai") {
    return generateImageOpenAi(payload);
  }
  return generateImagePollinations(payload);
};

const createVideoJob = async (payload) => {
  if (getAiMediaProvider() === "openai") {
    return createVideoJobOpenAi(payload);
  }
  return createVideoJobPollinations(payload);
};

const getVideoStatus = async (videoId) => {
  if (getAiMediaProvider() === "openai") {
    return getVideoStatusOpenAi(videoId);
  }
  return getVideoStatusPollinations(videoId);
};

const downloadCompletedVideo = async (videoId) => {
  if (getAiMediaProvider() === "openai") {
    return downloadCompletedVideoOpenAi(videoId);
  }
  return downloadCompletedVideoPollinations(videoId);
};

const buildVideoEmailSnippet = (payload) => {
  return {
    type: "video_email_snippet",
    landingUrl: payload.landingUrl,
    thumbnailUrl: payload.thumbnailUrl || "",
    emailHtml: buildVideoEmailHtml({
      landingUrl: payload.landingUrl,
      thumbnailUrl: payload.thumbnailUrl,
      altText: payload.altText,
      width: payload.emailWidth,
    }),
  };
};

module.exports = {
  generateImage,
  createVideoJob,
  getVideoStatus,
  downloadCompletedVideo,
  buildVideoEmailSnippet,
};
