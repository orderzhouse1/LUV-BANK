import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "./app-error";
import { logger } from "../lib/logger";
import type { RequestWithId } from "../middleware/request-id";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const requestId = (req as RequestWithId).requestId;

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.expose ? error.message : "An unexpected error occurred.",
        requestId,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        requestId,
      },
    });
    return;
  }

  // express-rate-limit may attach status 429
  if (
    typeof error === "object" &&
    error &&
    "status" in error &&
    (error as { status?: number }).status === 429
  ) {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many attempts. Please try again later.",
        requestId,
      },
    });
    return;
  }

  logger.error("unhandled error", {
    requestId,
    name: error instanceof Error ? error.name : "unknown",
  });

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      requestId,
    },
  });
};
