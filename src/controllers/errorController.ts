import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import AppError from "@src/utils/appError";
import sendResponse from "@src/utils/sendResponse";

// ─── Converters ────────────────────────────────────────────────────────────────

const handleCastError = (err: mongoose.Error.CastError): AppError =>
  new AppError(400, `Invalid value "${err.value}" for field "${err.path}"`);

const handleDuplicateKeyError = (err: {
  keyValue: Record<string, unknown>;
}): AppError => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new AppError(400, `"${value}" already exists. Please use a different ${field}`);
};

const handleMongooseValidationError = (
  err: mongoose.Error.ValidationError,
): AppError => {
  const errors = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  return new AppError(400, "Validation failed", { errors });
};

// ─── Global Error Handler ──────────────────────────────────────────────────────

const globalErrorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let error: AppError;

  // Convert known Mongoose / MongoDB errors into operational AppErrors
  if (err instanceof mongoose.Error.CastError) {
    error = handleCastError(err);
  } else if ((err as { code?: number }).code === 11000) {
    error = handleDuplicateKeyError(
      err as unknown as { keyValue: Record<string, unknown> },
    );
  } else if (err instanceof mongoose.Error.ValidationError) {
    error = handleMongooseValidationError(err);
  } else if (err instanceof AppError) {
    error = err;
  } else {
    // Programming / unknown error — do not leak details to the client
    console.error("PROGRAMMING ERROR:", err);
    error = new AppError(500, "Something went wrong. Please try again later.");
  }

  sendResponse(res, error.statusCode, {
    status: error.status,
    message: error.message,
    data: error.data,
  });
};

export default globalErrorHandler;
