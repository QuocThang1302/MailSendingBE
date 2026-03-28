const ApiError = require("../common/ApiError");

const errorHandler = (err, _req, res, _next) => {
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const message = isApiError ? err.message : "Internal server error";

  if (!isApiError) {
    // Keep detailed logs server-side while returning safe response to clients.
    console.error(err);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    details: isApiError ? err.details : null,
  });
};

module.exports = errorHandler;
