import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import authRouter from "@src/routes/authRoutes";
import AppError from "@src/utils/appError";
import globalErrorHandler from "@src/controllers/errorController";
import sendResponse from "@src/utils/sendResponse";

// ─── Process-level Safety Nets ────────────────────────────────────────────────

process.on("uncaughtException", (err: Error) => {
  console.error("UNCAUGHT EXCEPTION! Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

process.on("unhandledRejection", (err: Error) => {
  console.error("UNHANDLED REJECTION! Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

// ─── App ──────────────────────────────────────────────────────────────────────

const app = express();

app.use(morgan("dev"));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/", (_req: Request, res: Response) => {
  sendResponse(res, 200, {
    status: "success",
    message: "Welcome to zAcademy 5.0 backend",
    data: null,
  });
});

app.use("/api/v1/auth", authRouter);

// ─── Unhandled Routes ─────────────────────────────────────────────────────────

app.all("/{*splat}", (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(404, `Cannot find ${req.method} ${req.originalUrl} on this server`));
});

// ─── Global Error Handler (must be last) ─────────────────────────────────────

app.use(globalErrorHandler);

export default app;
