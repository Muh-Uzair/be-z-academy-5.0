class AppError extends Error {
  statusCode: number;
  status: "fail" | "error";
  isOperational: boolean;
  data: unknown;

  constructor(statusCode: number, message: string, data: unknown = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
    this.isOperational = true;
    this.data = data;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
