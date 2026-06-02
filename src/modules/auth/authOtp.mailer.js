const nodemailer = require("nodemailer");

const ApiError = require("../../common/ApiError");
const env = require("../../config/env");

let transporter = null;

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const isConfigured = () =>
  Boolean(env.otpEmailFrom && env.otpSmtpHost && env.otpSmtpUsername && env.otpSmtpPassword);

const getTransporter = () => {
  if (!isConfigured()) {
    return null;
  }

  if (!transporter) {
    const secure = Number(env.otpSmtpPort) === 465;
    transporter = nodemailer.createTransport({
      host: env.otpSmtpHost,
      port: Number(env.otpSmtpPort),
      secure,
      requireTLS: env.otpSmtpUseTls === true && !secure,
      auth: {
        user: env.otpSmtpUsername,
        pass: env.otpSmtpPassword,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });
  }

  return transporter;
};

const subjectForPurpose = (purpose) =>
  ({
    email_change: "Confirm your new ChadMailer email",
    password_change: "Your ChadMailer password change OTP",
    password_reset: "Your ChadMailer password reset OTP",
    register: "Your ChadMailer verification OTP",
  })[purpose] || "Your ChadMailer verification OTP";

const introForPurpose = (purpose) =>
  ({
    email_change: "Use this OTP to confirm this email address for your account.",
    password_change: "Use this OTP to confirm your password change.",
    password_reset: "Use this OTP to create a new password for your ChadMailer account.",
    register: "Use this OTP to finish creating your ChadMailer account.",
  })[purpose] || "Use this OTP to verify your ChadMailer account.";

const mapSmtpError = (error) => {
  const code = String(error?.code || "");
  const responseCode = Number(error?.responseCode || 0);
  const reason = error instanceof Error ? error.message : "Unknown SMTP error";

  if (code === "EAUTH" || responseCode === 535) {
    return new ApiError(502, "OTP email SMTP authentication failed", {
      reason,
      hint:
        "For Gmail, OTP_SMTP_PASSWORD must be a Google App Password, not your normal Gmail password.",
    });
  }

  return new ApiError(502, "OTP email delivery failed", {
    reason,
  });
};

const sendOtpEmail = async ({ to, purpose, code, expiresInMinutes }) => {
  const mailer = getTransporter();
  if (!mailer) {
    if (env.nodeEnv !== "production") {
      console.warn(`[auth-otp] ${purpose} OTP for ${to}: ${code}`);
      return { delivered: false, debugLogged: true };
    }
    throw new ApiError(503, "OTP email SMTP is not configured");
  }

  const subject = subjectForPurpose(purpose);
  const intro = introForPurpose(purpose);
  const safeCode = escapeHtml(code);

  try {
    await mailer.sendMail({
      from: env.otpEmailFrom,
      to,
      subject,
      text: `${intro}\n\nOTP: ${code}\n\nThis code expires in ${expiresInMinutes} minutes.`,
      html:
        `<p>${escapeHtml(intro)}</p>` +
        `<p style="font-size:28px;font-weight:700;letter-spacing:6px;">${safeCode}</p>` +
        `<p>This code expires in ${expiresInMinutes} minutes.</p>` +
        "<p>If you did not request this, you can ignore this email.</p>",
    });
  } catch (error) {
    throw mapSmtpError(error);
  }

  return { delivered: true };
};

module.exports = {
  sendOtpEmail,
};
