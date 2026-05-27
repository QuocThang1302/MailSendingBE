const asyncHandler = require("../../common/asyncHandler");
const trackingService = require("./tracking.service");

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
  "base64",
);

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const open = asyncHandler(async (req, res) => {
  await trackingService.recordOpen(req.params.token, req);
  res.set({
    "Content-Type": "image/gif",
    "Content-Length": TRANSPARENT_GIF.length,
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
  });
  return res.status(200).send(TRANSPARENT_GIF);
});

const click = asyncHandler(async (req, res) => {
  const destination = await trackingService.getClickDestination(
    req.params.token,
    req,
  );
  return res.redirect(302, destination);
});

const unsubscribePage = asyncHandler(async (req, res) => {
  const data = await trackingService.getUnsubscribeContext(req.params.token);
  const message = data.alreadyUnsubscribed
    ? "This email address is already unsubscribed."
    : "Confirm that you no longer want to receive campaign emails.";
  const button = data.alreadyUnsubscribed
    ? ""
    : `<form method="post"><button type="submit">Unsubscribe</button></form>`;

  return res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unsubscribe</title>
  <style>
    body { font: 16px Arial, sans-serif; color: #18212f; background: #f5f7fb; margin: 0; }
    main { max-width: 460px; margin: 64px auto; padding: 32px; background: white; border-radius: 16px; text-align: center; }
    p { color: #596579; line-height: 1.55; }
    button { border: 0; border-radius: 8px; padding: 12px 22px; background: #243b73; color: white; cursor: pointer; }
  </style>
</head>
<body><main><h1>Unsubscribe</h1><p>${escapeHtml(data.email)}</p><p>${message}</p>${button}</main></body>
</html>`);
});

const unsubscribe = asyncHandler(async (req, res) => {
  await trackingService.unsubscribe(req.params.token, req);
  return res.type("html").send(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Unsubscribed</title></head>
<body style="font:16px Arial,sans-serif;text-align:center;padding:64px;color:#18212f">
  <h1>You have been unsubscribed.</h1>
  <p>You will no longer receive campaign emails from this sender.</p>
</body>
</html>`);
});

module.exports = {
  open,
  click,
  unsubscribePage,
  unsubscribe,
};
