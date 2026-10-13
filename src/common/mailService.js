const nodemailer = require("nodemailer");
const env = require("../config/env");

const transporterCache = new Map();

const normalizePort = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
};

const normalizeSmtpErrorMessage = (error) => {
  const message =
    error instanceof Error
      ? error.message
      : String(error || "Unknown SMTP error");

  if (/Invalid login|Username and Password not accepted|EAUTH/i.test(message)) {
    return `${message}. For Gmail, use a Google App Password, not your normal account password.`;
  }

  if (
    /ETIMEDOUT|Connection timeout|Greeting never received|ESOCKET/i.test(
      message,
    )
  ) {
    return `${message}. Check SMTP host/port and firewall. Gmail typically uses smtp.gmail.com with port 587 (TLS) or 465 (SSL).`;
  }

  return message;
};

const buildTransporterConfig = (account) => {
  const port = normalizePort(account.smtp_port || account.smtpPort);
  const secure = port === 465;
  const useTls =
    account.use_tls !== undefined ? account.use_tls : (account.useTls ?? true);

  return {
    host: account.smtp_host || account.smtpHost,
    port,
    secure,
    requireTLS: useTls === true && !secure,
    auth: {
      user: account.smtp_username || account.smtpUsername,
      pass: account.smtp_password || account.smtpPassword,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  };
};

const getTransporter = (account) => {
  const port = normalizePort(account.smtp_port || account.smtpPort);
  const cacheKey = JSON.stringify({
    host: account.smtp_host || account.smtpHost,
    port,
    username: account.smtp_username || account.smtpUsername || "",
    secure: port === 465,
    useTls: Boolean(account.use_tls ?? account.useTls),
  });

  if (!transporterCache.has(cacheKey)) {
    transporterCache.set(
      cacheKey,
      nodemailer.createTransport(buildTransporterConfig(account)),
    );
  }

  return transporterCache.get(cacheKey);
};

let otpTransporter = null;

const isOtpConfigured = () =>
  Boolean(
    env.otpEmailFrom &&
    env.otpSmtpHost &&
    env.otpSmtpUsername &&
    env.otpSmtpPassword,
  );

const getOtpTransporter = () => {
  if (!isOtpConfigured()) {
    return null;
  }

  if (!otpTransporter) {
    const port = normalizePort(env.otpSmtpPort);
    const secure = port === 465;
    otpTransporter = nodemailer.createTransport({
      host: env.otpSmtpHost,
      port,
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

  return otpTransporter;
};

const verifyConnection = async (account) => {
  const transporter = getTransporter(account);
  return transporter.verify();
};

const buildFromAddress = (account) => {
  const address = account.email_address || account.emailAddress;
  const name = (account.display_name || account.displayName || "").trim();
  return name ? `"${name.replace(/"/g, '\\"')}" <${address}>` : address;
};

const sendMail = async (transporterOrAccount, mailOptions) => {
  const transporter =
    typeof transporterOrAccount?.sendMail === "function"
      ? transporterOrAccount
      : getTransporter(transporterOrAccount);

  return transporter.sendMail(mailOptions);
};

module.exports = {
  buildTransporterConfig,
  getTransporter,
  getOtpTransporter,
  isOtpConfigured,
  verifyConnection,
  buildFromAddress,
  sendMail,
  normalizeSmtpErrorMessage,
  normalizePort,
};
