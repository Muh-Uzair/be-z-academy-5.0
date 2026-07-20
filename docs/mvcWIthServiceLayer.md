# be-z-academy-5.0 — Backend Architecture

> Note: an older file `docs/featureBasedArchitecture.md` describes a *different* project ("Fleet-BE") and does not apply here. This document describes the actual architecture of **this** repository as it exists today.

## 1. Tech Stack

| Concern | Choice |
|---|---|
| Language | TypeScript, run via `ts-node-dev` (dev) with `tsconfig-paths` for the `@src/*` path alias |
| HTTP framework | Express 5.2 |
| Database / ODM | MongoDB via Mongoose 9.7 |
| DB migrations | `migrate-mongo` (ad-hoc data migrations, not schema migrations — Mongoose is schemaless at the DB level) |
| Auth | `jsonwebtoken` (access + refresh tokens) + httpOnly cookies, `bcryptjs` for password hashing, email OTP for student/admin verification |
| Validation | `zod` schemas run through a generic validation middleware |
| Security | `helmet`, `express-rate-limit`, `hpp`, `express-mongo-sanitize`, `xss-clean` |
| File storage | AWS S3 via presigned URLs (`@aws-sdk/client-s3`, `@aws-sdk/s3-presigned-post`, `@aws-sdk/s3-request-presigner`) — no direct server-side multipart handling |
| Payments | Stripe Connect (Express accounts), using Stripe's v2 "thin events" webhook model |
| Email | `nodemailer` |
| Real-time (planned, not yet wired) | `@socket.io/redis-adapter` is a dependency; `conversationModel`/`messageModel` exist but no controller/routes reference them yet |
| Logging | `morgan` (dev request logging only) |

There is no ORM-style schema migration system, no job queue, and no OpenAPI/Swagger docs mounted.

## 2. Bootstrap Flow

- **`src/server.ts`** — entry point: loads env, connects to MongoDB (`src/config/db.ts`), then `app.listen(...)`. Registers `uncaughtException`/`unhandledRejection` handlers that log and `process.exit(1)`.
- **`src/app.ts`** — builds and exports the Express `app` only (no `.listen()`), so the app object is easily testable in isolation.

### `src/app.ts` middleware pipeline, in order

1. `morgan("dev")` — request logging.
2. **Stripe router mounted first**, before the JSON body parser — `/api/v1/stripe` needs the *raw* request body for webhook signature verification, so the webhook route inside `stripeRoutes.ts` uses `express.raw({ type: "application/json" })` and must not have `express.json()` run over it first.
3. `express.json({ limit: "10kb" })`.
4. `cookieParser()`.
5. NoSQL injection sanitization — a small inline middleware that runs `mongoSanitize.sanitize()` over `body`/`query`/`params`/`headers`.
6. XSS sanitization — a recursive inline sanitizer that runs `xss-clean`'s `clean()` over every string field of `body`/`query`/`params`/`headers`.
7. `hpp()` — HTTP parameter pollution guard (whitelist currently empty).
8. `helmet()` — security headers.
9. `express-rate-limit` — 100 requests/hour per IP, scoped to `/api`.
10. `GET /health` — liveness check, returns the standard response envelope.
11. Domain routers: `/api/v1/auth`, `/api/v1/users`, `/api/v1/categories`, `/api/v1/courses`.
12. Catch-all 404 handler (`app.all("/{*splat}", ...)` — Express 5 wildcard syntax) → `AppError(404, ...)`.
13. `globalErrorHandler` — must be mounted last.

## 3. `src/` Folder Structure

```
src/
  app.ts                 Express app assembly (no listen())
  server.ts              Bootstrap: env, DB connect, listen(), process safety nets
  config/                env.ts, db.ts, stripe.ts, s3.ts, mailer.ts
  constants/              Per-domain constants (limits, S3 folders, MIME maps, URLs)
  routes/                 One *Routes.ts per domain
  controllers/            Thin request/response handlers, one per domain + errorController
  services/               Business logic + Mongoose/S3/Stripe calls
  models/                 Mongoose schemas
  middlewares/            protect / restrictTo / optionalAuth / validation
  validations/            Zod schemas per domain, consumed by validationMiddleware
  utils/                  appError, catchAsync, sendResponse, cookies, jwt, email, courseUtils
  types/                  Shared TS interfaces + Express Request augmentation (expressTypes.d.ts)
migrations/               migrate-mongo ad-hoc data migration scripts (root-level, not under src/)
```

This is a classic **layered/MVC-style** structure organized by technical layer, with each layer further split **per domain** (auth, user, category, course, stripe) — not a vertical "feature-folder" architecture.

### Domains present

- **auth** — signup, OTP verification/resend, signin, refresh-token rotation.
- **user** — instructor listing/approval, profile-ish operations (`userController.ts`, `userServices.ts`).
- **category** — course category CRUD, with S3-backed category images.
- **course** — course CRUD, video/document uploads via S3, slug generation.
- **stripe** — instructor Stripe Connect onboarding + webhook handling for account status.

### Models present but not yet wired to routes/controllers

`enrollmentModel.ts`, `reviewModel.ts`, `transactionModel.ts`, `conversationModel.ts`, `messageModel.ts` exist as Mongoose schemas but have no corresponding controller/service/route yet — these represent planned-but-unbuilt features (enrollment, reviews, payments/transactions, and a real-time chat system, consistent with the `@socket.io/redis-adapter` dependency).

## 4. Request Lifecycle

Example: `PATCH /api/v1/users/instructor/:id/verification`

```
route (userRoutes.ts)
  → protectMiddleware        (JWT auth — reads accessToken cookie, sets req.user)
  → restrictToMiddleware(Role.Admin)   (RBAC check against req.user.role)
  → validationMiddleware(schema, "params")
  → validationMiddleware(schema, "body")
  → controller (catchAsync-wrapped)
      → service                (Mongoose queries, throws AppError on business-rule failure)
          → model
      ← sendResponse(res, statusCode, { status, message, data })
  (any thrown error) → next(err) → globalErrorHandler
```

### protectMiddleware (`src/middlewares/protectMiddleware.ts`)

Reads the `accessToken` httpOnly cookie, verifies it with `verifyAccessToken`, and sets `req.user = { id, role }`. Missing/invalid token → `next(new AppError(401, ...))`.

### restrictToMiddleware (`src/middlewares/restrictToMiddleware.ts`)

Checks `req.user.role` against an allow-list of roles passed as arguments, e.g. `restrictToMiddleware(Role.Admin)`. For some pre-auth flows (e.g. OTP verification, where there's no `req.user` yet) it falls back to looking up the role via `req.body.email`. Throws `AppError(403, ...)` if the role isn't allowed.

### validationMiddleware (`src/middlewares/validationMiddleware.ts`)

Generic `validationMiddleware(schema, source)` where `source` is `"body" | "query" | "params"`, reused across every domain's Zod schemas. Because Express 5 made `req.query` a read-only getter, validated `query`/`params` values are **not** reassigned back onto `req.query`/`req.params` — instead they're placed on custom properties `req.validatedQuery` / `req.validatedParams`, declared via `src/types/expressTypes.d.ts` (an Express `Request` interface augmentation). Controllers must read from `req.validatedParams`/`req.validatedQuery`, not `req.params`/`req.query` directly, when a validation schema is in the chain.

### catchAsync (`src/utils/catchAsync.ts`)

A higher-order function wrapping every controller/service call that returns a Promise, forwarding rejections to `next(err)` so controllers never need manual try/catch.

## 5. Response & Error Conventions

### Uniform response envelope

Every response — success or failure — has the same shape, built by `sendResponse(res, statusCode, { status, message, data })`:

```json
{ "status": "success" | "fail" | "error", "message": "string", "data": unknown }
```

`status` is `"success"` for 2xx, `"fail"` for operational 4xx errors, `"error"` for unexpected 5xx errors.

### AppError (`src/utils/appError.ts`)

Custom error class carrying `statusCode`, `status` (derived from the code), `isOperational: true`, and an optional `data` payload (e.g. an array of field-level validation errors). Thrown from any layer — middleware, controller, or (most commonly) service — and always caught via `catchAsync` or an explicit `next(err)`.

### globalErrorHandler (`src/controllers/errorController.ts`)

Mounted last in `app.ts`. Normalizes framework/driver errors into `AppError`s before responding:
- Mongoose `CastError` → 400
- Mongoose duplicate key (`code: 11000`) → 400
- Mongoose `ValidationError` → 400 with per-field messages
- Anything unrecognized → generic 500, with internals logged server-side but never leaked to the client.

Responds through the same `sendResponse` helper used everywhere else, so clients never see two different response shapes for success vs. failure.

## 6. Service Layer Conventions

Every exported service function in `src/services/*.ts` follows the same shape:

```ts
// FUNCTION
export const someService = async (args): Promise<any> => {
  // Step 1: ...
  // Step 2: ...
  throw new AppError(404, "Not found"); // on business-rule violation
  return data;
};
```

- Services are the **only** layer that touches Mongoose models directly — controllers never import a model.
- Return type is intentionally `Promise<any>` project-wide (an established convention, not an oversight — see note below).
- Ownership/ownership-style checks (e.g. "does this instructor own this course?") live in the service layer, not in middleware (e.g. `getOwnedCourseOrThrow` in `courseServices.ts`).
- Numbered `// Step N:` comments document the sequence of DB/business operations within each function.

## 7. Authentication & Authorization

- **Roles**: a `Role` enum (`admin` / `instructor` / `student`) lives on `userModel.ts` and is imported everywhere `restrictToMiddleware(...roles)` is used.
- **Signup** (`authServices.signupService`): hashes password with `bcrypt`; students get a 6-digit OTP emailed (10-minute expiry) and must verify before signing in; instructors are created `isVerified: false` and are approved by an admin instead (via the `/users/instructor/:id/verification` endpoint), not by OTP.
- **OTP verify/resend** (`verifyOtpService`, `resendOtpService`): validates the OTP and expiry, then clears the OTP fields on success.
- **Signin** (`signinService`): checks password via `bcrypt.compare`, blocks unverified accounts with a role-specific message ("pending Admin approval" for instructors vs. "please verify your account" for students), then issues an access token (7d) and refresh token (30d) via `signAccessToken`/`signRefreshToken` (`src/utils/jwt.ts`).
- **Token storage**: both tokens are set as httpOnly cookies (`setAuthCookies`, `src/utils/cookies.ts`) with `secure` in production and `sameSite: "strict"`. There is **no server-side refresh-token store** — refresh is purely stateless JWT verification (a deliberate choice, not a gap — see project conventions below).
- **Rotate token** (`rotateTokenService`): verifies the refresh token, confirms the user still exists, and issues a fresh access+refresh token pair.

## 8. File Uploads (S3)

No multipart/form-data is ever handled by the Express server itself:

1. Client asks the API for a presigned upload URL (`s3Services.getPresignedPostUrlService`), scoped by folder, allowed MIME type, and max size (constants like `CATEGORY_MAX_IMAGE_SIZE_IN_BYTES`, `COURSE_MAX_VIDEO_SIZE_IN_BYTES` in `src/constants/`).
2. Client uploads the file directly to S3 using the presigned POST.
3. Client submits the resulting S3 `key` in the create/update request body; only the key is ever persisted in Mongo, never a public URL.
4. Reads: for public-ish assets the key is turned into a signed GET URL on the way out. For course videos specifically, `withSignedVideoUrl` (`courseServices.ts`) strips the raw `videoKey` from every response and injects a freshly-signed, time-limited `videoUrl` instead — video keys are never exposed to the client.
5. On replace/delete, orphaned S3 objects are cleaned up via `s3Services.deleteS3ObjectService`.

## 9. Payments (Stripe Connect)

- Instructors onboard via Stripe **Express connected accounts**: `stripeServices.getInstructorOnboardingLinkService` lazily creates the connected account on first request and returns a Stripe `accountLinks` onboarding URL for the client to redirect to.
- The webhook route is mounted before `express.json()` in `app.ts` and uses `express.raw({ type: "application/json" })` so the raw body is available for signature verification.
- `stripeController.handleStripeWebhook` verifies the webhook using `stripe.parseEventNotificationAsync` (Stripe's newer v2 "thin events" model, verified against `STRIPE_WEBHOOK_SECRET`), re-fetches the full `Account` object from Stripe, then delegates to `stripeServices.handleAccountUpdatedEventService`.
- That service flips `stripeOnboardingComplete: true` on the instructor's user document once Stripe reports the account's `payouts` capability as `active` — i.e., the instructor can't receive money in the app's model until Stripe itself confirms payouts are enabled.

## 10. Configuration

- **`src/config/env.ts`** — validates the entire `process.env` against a strict `zod` schema at process startup, `process.exit(1)` on failure. Every other module imports the resulting typed `env` object rather than reading `process.env` directly.
- **`src/config/db.ts`** — Mongoose connection setup.
- **`src/config/stripe.ts`** / **`src/config/s3.ts`** / **`src/config/mailer.ts`** — typed SDK client instances (Stripe client, S3 client, Nodemailer transport) built from `env`.

## 11. Database Migrations

- Tool: `migrate-mongo`, config in `migrate-mongo-config.ts`, scripts `npm run migrate:up|down|status`.
- Because Mongoose is schemaless at the DB layer, these are **data migrations** (backfilling new fields, renaming fields, removing `__v`), not schema/DDL migrations. Example: `migrations/20260713120000-add-stripe-fields-to-instructors.ts` adds Stripe-related fields to existing instructor documents.
- All Mongoose models share a plugin that disables `versionKey` (`__v`) and use `models.X || model(...)` guards to avoid the "Cannot overwrite model" error that `ts-node-dev`'s hot-reload would otherwise trigger.

## 12. Known Gaps / Next Steps (as of this writing)

1. **Not yet wired to any route/controller**: enrollment, review, transaction, and conversation/message (chat) features — models exist, application logic does not.
2. **Real-time chat**: `@socket.io/redis-adapter` is installed but there is no Socket.IO server initialization anywhere in `app.ts`/`server.ts` yet.
3. **No API documentation** (OpenAPI/Swagger) is mounted.
4. **No automated test suite** — `npm test` is a placeholder (`echo "Error: no test specified" && exit 1`).

---

*This document reflects the codebase as of 2026-07-18. Treat it as a snapshot — re-verify specific file paths/behavior against the code before relying on details for new work, especially around the "not yet wired" features in §12, which are the parts most likely to change next.*
