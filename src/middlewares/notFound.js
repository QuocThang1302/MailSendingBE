const ApiError = require("../common/ApiError");

const notFound = (_req, _res, next) => {
  next(new ApiError(404, "Resource not found"));
};

module.exports = notFound;
