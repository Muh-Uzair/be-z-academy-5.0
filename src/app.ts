import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import authRouter from "@src/routes/authRoutes";
import AppError from "@src/utils/appError";
import globalErrorHandler from "@src/controllers/errorController";
import sendResponse from "@src/utils/sendResponse";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import { clean as xssClean } from "xss-clean/lib/xss";
import hpp from "hpp";

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

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));

// ─── Security Middleware ──────────────────────────────────────────────────────

// Data sanitization against NoSQL query injection
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.query) mongoSanitize.sanitize(req.query);
  if (req.params) mongoSanitize.sanitize(req.params);
  if (req.headers) mongoSanitize.sanitize(req.headers);
  next();
});

// Data sanitization against XSS
app.use((req, res, next) => {
  const sanitizeObject = (obj: any) => {
    if (!obj) return;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = xssClean(obj[key]);
      }
    }
  };

  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);
  sanitizeObject(req.headers);

  next();
});

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      // Add fields here that are allowed to have duplicate parameters in the query string
    ],
  }),
);

// Set security HTTP headers
app.use(helmet());

const limiter = rateLimit({
  max: 100, // Limit each IP to 100 requests per windowMs
  windowMs: 60 * 60 * 1000, // 1 hour
  message: "Too many requests from this IP, please try again in an hour!",
});

app.use("/api", limiter);

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

app.all(
  "/{*splat}",
  (req: Request, _res: Response, next: NextFunction): void => {
    next(
      new AppError(
        404,
        `Cannot find ${req.method} ${req.originalUrl} on this server`,
      ),
    );
  },
);

// ─── Global Error Handler (must be last) ─────────────────────────────────────

app.use(globalErrorHandler);

export default app;
