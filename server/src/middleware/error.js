import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";
import { isProduction } from "../config/env.js";

export const notFound = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let details = err.details || null;

  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";
    details = err.flatten();
  }

  if (err.name === "CastError") {
    statusCode = 404;
    message = "Resource not found";
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate record";
    details = err.keyValue;
  }

  if (!isProduction) {
    console.error(err);
  }

  res.status(statusCode).json({
    message,
    details,
    stack: isProduction ? undefined : err.stack
  });
};
