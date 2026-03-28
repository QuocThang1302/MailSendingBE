const ApiError = require("./ApiError");

const validate = (schemas) => (req, _res, next) => {
  const validationErrors = [];

  for (const [segment, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(req[segment]);
    if (!result.success) {
      validationErrors.push({
        segment,
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    } else {
      req[segment] = result.data;
    }
  }

  if (validationErrors.length > 0) {
    return next(new ApiError(400, "Validation failed", validationErrors));
  }

  return next();
};

module.exports = validate;
