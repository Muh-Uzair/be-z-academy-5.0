# Backend Architecture Guide

This document describes a general-purpose architecture pattern for a Node.js/TypeScript REST API backend built on Express and Mongoose. It is written to be applicable across projects, not tied to any single codebase's specifics — use it as a reference for how such a system is typically organized and why.

---

## 1. Tech Stack Choices

| Concern | Typical choice | Why |
|---|---|---|
| Language | TypeScript, strict mode | Catches type errors at compile time, self-documents contracts between layers |
| HTTP framework | Express | Minimal, unopinionated, huge middleware ecosystem |
| Database / ORM | MongoDB via Mongoose | Schema flexibility with optional structure via schemas; good fit for document-shaped domain data |
| Auth | Passport + JWT (+ optional OAuth strategies) | Stateless auth that scales horizontally without server-side session storage |
| Validation | Joi (or Zod) | Declarative schema validation for both request payloads and environment variables |
| Real-time | Socket.IO | WebSocket abstraction with fallback transport and room/namespace support |
| Logging | Winston (app logs) + Morgan (HTTP access logs) | Structured, leveled logging separate from request logging |
| File storage | S3-compatible object storage | Offloads binary storage from the app server/DB |
| Scheduling | In-process cron (`croner`, `node-cron`) or external queue (BullMQ + Redis) | In-process is simplest for a single instance; a real queue is needed once jobs must survive restarts or scale across workers |
| API docs | OpenAPI/Swagger | Machine-readable contract, enables auto-generated clients and interactive docs UI |
| Process manager | PM2 or container orchestration | Keeps the process alive, handles restarts, clustering |

---

## 2. Bootstrap Flow

A clean separation between "build the app" and "run the app" keeps the app testable (you can import the Express instance in tests without binding a port or opening a DB connection).

```
src/app.ts     Builds and exports the Express app (middleware, routes). No .listen().
src/index.ts   Entry point: connects to the DB, wraps app in an HTTP server,
               starts listening, initializes real-time/socket layer, starts
               background jobs, registers process-level shutdown handlers.
```

Typical `index.ts` responsibilities, in order:

1. Connect to the database.
2. On successful connection, create the HTTP server around the Express app.
3. Initialize any real-time layer (Socket.IO) and attach it to the app instance so route handlers can reach it.
4. Start listening on the configured port.
5. Start any in-process scheduled jobs.
6. Register `uncaughtException`, `unhandledRejection`, and `SIGTERM`/`SIGINT` handlers for graceful shutdown (close DB connections, drain in-flight requests).

### Typical `app.ts` middleware pipeline (order matters)

1. Request logging (dev-only is common, to avoid double-logging with a hosted platform's own logs).
2. CORS.
3. Any webhook routes that need the **raw** request body (e.g. payment provider signature verification) — these must be registered *before* the JSON body parser, since a global body parser would consume the raw bytes first.
4. Body parsers (JSON, urlencoded).
5. Compression.
6. Auth framework initialization (e.g. `passport.initialize()`).
7. Rate limiting on sensitive routes (login, password reset).
8. Mount the main API router (commonly under a version prefix like `/v1`).
9. Security headers (e.g. Helmet/CSP) — **must be registered before routes**, not after, or it won't apply to API responses.
10. 404 handler.
11. Error conversion + centralized error handler — always last.

---

## 3. Top-Level Folder Structure

Two common organizing philosophies:

**A. Vertical-slice / feature-based** (recommended for most product backends):

```
src/index.ts        Bootstrap
src/app.ts           Express app assembly
src/config/          Env config, roles/permissions, third-party SDK init
src/docs/            API spec, architecture docs
src/routes/v1/       One route file per resource + an aggregator
src/modules/         One folder per feature/domain, each self-contained
src/scripts/         Standalone one-off scripts (seeders, backfills) — not run by the server
```

Each feature owns its own controller, service, model, and validation — there is no global `src/controllers/`, `src/services/`, or `src/models/` folder. This keeps related code physically close and makes a feature easy to delete or extract into its own service later.

**B. Layer-based** (simpler for small apps): top-level `src/controllers/`, `src/services/`, `src/models/`, `src/routes/`, each containing one file per resource. Scales worse as the number of resources grows, since every change touches three or four distant folders.

---

## 4. Module Structure Pattern (vertical-slice)

Standard shape for a feature module, `src/modules/<feature>/`:

```
<feature>.controller.ts    Thin Express handlers — parse req, call service, shape response
<feature>.service.ts       Business logic, DB queries, cross-module orchestration
<feature>.model.ts         Mongoose schema/model definition
<feature>.validation.ts    Joi/Zod schemas for params/query/body
<feature>.interface.ts     TypeScript types/interfaces for the domain
index.ts                   Barrel re-export of the module's public surface
```

Guidelines:

- **Controllers stay thin.** No business logic, no direct DB calls — just request parsing, calling the service, and mapping the result to an HTTP response. Wrap async handlers in a `catchAsync`-style utility so promise rejections reach the error middleware automatically instead of crashing the process.
- **Services own business logic and DB access.** Anything involving more than a trivial single-query lookup belongs here, not in the controller.
- **Models are schema-only.** Mongoose plugins (see §5) belong on the model, not duplicated per-feature.
- A module that wraps an external API (e.g. a payment processor, a third-party data provider) commonly splits into more files: a raw HTTP client, a service that maps between the domain and the external API's shape, and sometimes a billing/pricing sub-service if usage-based charges are involved.
- A module with role-specific variants of an entity (e.g. different user types with different fields) commonly uses Mongoose discriminators: one base model plus one file per subtype.

### Cross-cutting / generic modules

Not every module is a business feature — several exist purely to be imported by other modules:

- **`errors/`** — custom error class + centralized error handler.
- **`validate/`** — the validation middleware itself (distinct from each feature's `.validation.ts` schema).
- **`utils/`** — small stateless helpers (async wrapper, crypto, CSV export, response shaping, rate limiter).
- **`logger/`** — the app-wide logger instance and HTTP logging middleware.
- **`paginate/`** — a shared Mongoose plugin adding a `.paginate()` static.
- **`toJSON/`** — a shared Mongoose plugin normalizing serialized output (e.g. `_id` → `id`, stripping internal fields).
- **`token/`** — JWT issuance/refresh/verification logic, separate from the `auth` feature module itself.
- **`socket/`** — real-time layer config, event definitions, and connection middleware.

---

## 5. Database Layer

- One connection, established once at bootstrap, reused across the app (no per-request connections).
- **No migrations** is common with Mongoose — schema evolution happens by changing the schema definition and, if needed, running a one-off backfill script from `src/scripts/`. This trades migration tooling for flexibility; it works well for document stores where most schema changes are additive.
- Shared plugins applied to every (or most) schemas avoid repeating boilerplate:
  - A **pagination plugin** — adds a consistent `.paginate(filter, options)` static returning `{ results, page, limit, totalPages, totalResults }`.
  - A **serialization plugin** — normalizes `.toJSON()` output (rename `_id`, drop `__v` and any fields marked private) so API responses are consistent without every controller manually reshaping documents.

### Multi-tenancy (if applicable)

Two approaches:

1. **Middleware/hook-enforced** — a shared piece of code automatically injects/filters `tenantId` on every query. Safer by default, but requires discipline to keep every model routed through it.
2. **Manual per-service convention** — each service reads `tenantId` off the authenticated user and explicitly injects/filters it in every query it writes. Simpler to build, but the burden of not leaking cross-tenant data falls on every individual PR — this is the more error-prone option and worth flagging explicitly in team documentation/checklists if chosen, since a forgotten filter is a data leak, not just a bug.

Regardless of approach, decide per-field whether uniqueness is tenant-scoped (e.g. an internal reference number) or global (e.g. a VIN, or any ID sourced from an external system).

---

## 6. Routing

- A single **aggregator router** (e.g. `src/routes/v1/index.ts`) imports one route file per resource and mounts each under its path prefix. This keeps `app.ts` from needing to know about every resource individually — it mounts the aggregator once.
- Each per-resource route file chains, per endpoint: **auth middleware** → **validation middleware** → **controller method**. Keeping this chain visible at the route-definition level (rather than hidden inside the controller) makes the security/validation posture of every endpoint auditable at a glance.
- Endpoints needing the raw request body (webhook signature verification) must bypass the normal JSON-parsed router tree and be registered directly on the app, ahead of the body parser (see §2).

---

## 7. Middleware

Common middleware categories and where they typically live:

| Category | Typical location | Responsibility |
|---|---|---|
| Auth | `modules/auth/auth.middleware.ts` | Verify JWT, load the current user, enforce role/permission checks |
| Validation | `modules/validate/validate.middleware.ts` | Validate `params`/`query`/`body` against a schema, coerce/normalize values, reject with a structured 400 on failure |
| Feature-specific | inside the owning module | One-off request shaping needed only by that feature |
| Real-time auth | `modules/socket/socket.middleware.ts` | Authenticate WebSocket connections before allowing them to join rooms |

Global, cross-cutting middleware (CORS, body parsing, compression, security headers, rate limiting) is typically declared inline in `app.ts` rather than split into many single-purpose files, since it applies uniformly and rarely changes.

**Common pitfalls to avoid:**
- Registering security headers (Helmet/CSP) after routes instead of before.
- Leaving sanitization middleware (XSS/NoSQL-injection sanitizers) installed as a dependency but never actually wired in.
- Applying rate limiting only in production and forgetting to verify it in staging, where abuse patterns are also worth catching.

---

## 8. Authentication & Authorization

- **JWT-based auth** is the default for stateless APIs: a Passport strategy (or equivalent) extracts the bearer token, verifies the signature, checks token type (access vs. refresh) and expiry, and loads the corresponding user. Reject tokens issued before the user's most recent password change to invalidate old sessions on password reset.
- **OAuth strategies** (Google, etc.) are typically optional and gated behind the presence of their client ID/secret env vars, so the app runs fine without them configured.
- **An `auth(...requiredPermissions)` middleware factory** is a common pattern: it verifies the JWT, confirms the user is active, attaches the user to the request, and checks the user's role against the route's required permissions — all in one place, used declaratively in route definitions.
- **RBAC** can be static (a hardcoded role → permission-list map in config, simple and fast, but requires a deploy to change) or dynamic (roles/permissions stored in the DB, more flexible, more moving parts). Static maps are common until the number of roles or the need for customer-configurable roles grows.
- **Token issuance/refresh** is usually its own module, separate from the `auth` feature module, since tokens (access, refresh, reset-password, email-verification) have their own lifecycle and storage needs.

---

## 9. Configuration & Environment

- Validate environment variables at startup with a schema (Joi/Zod), and **fail fast** — refuse to boot rather than run with a missing or malformed config value that would fail unpredictably later.
- Group the validated config into a single exported object, organized by domain (`config.db`, `config.jwt`, `config.email`, `config.stripe`, …) rather than reading `process.env` scattered throughout the codebase. This gives one place to see everything the app depends on externally, and makes it trivial to grep for every config key in use.
- Keep role/permission definitions and third-party SDK initialization (Firebase, etc.) in `config/` alongside env parsing, since they're also "how the app is configured to run."

---

## 10. External Integrations

General pattern: each third-party integration gets its own module under `src/modules/`, containing at minimum a thin client wrapping the provider's SDK/HTTP API and a service translating between the provider's data shape and the app's domain model. Webhooks from a provider live in a shared `webhook/` module (or inside the integration's own module) and are registered as raw-body routes if the provider signs its payloads.

Typical integration categories in a fleet/operations-style backend:
- **Payments/billing** (e.g. Stripe) — subscriptions, invoices, webhook-driven state sync.
- **Banking** (e.g. Plaid) — account linking, transaction sync.
- **Background checks / verification** (e.g. Checkr, Veriff) — often the most complex integration, since it may combine an external API client, a pricing/billing sub-service, and webhook-driven status updates.
- **Telematics/IoT** (e.g. Geotab) — device credentials storage plus an activity/event log model.
- **File storage** (e.g. S3) — presigned URL generation, upload/download helpers.
- **Notifications** (e.g. Firebase push, email/SMTP) — a thin sender wrapper, called from services rather than duplicated per feature.
- **AI/RAG** (e.g. OpenAI + a vector DB) — retrieval and generation logic isolated in its own module so model/provider swaps don't ripple through the rest of the app.

---

## 11. Error Handling

- **A custom error class** (e.g. `ApiError extends Error`) carrying an HTTP status code, an `isOperational` flag (distinguishing expected/handled errors from bugs), and optionally a structured per-field error map for validation failures.
- **An error converter middleware** that normalizes *any* thrown error — including ones from libraries (DB cast errors, duplicate-key errors, schema validation errors, JWT errors) — into the custom error shape, so the final handler only ever deals with one type.
- **A centralized error handler**, registered last in the middleware chain, that:
  - Returns a consistent response shape (e.g. `{ code, message, errors? }`).
  - In production, hides internal details of non-operational (unexpected/bug) errors behind a generic message, to avoid leaking stack traces or internals to clients.
  - Logs the error (with stack trace) in development.
- **An async-wrapper utility** (`catchAsync`) around every controller handler, so a rejected promise is forwarded to `next()` instead of crashing the process or hanging the request — this is essential in Express 4, which doesn't natively catch async errors.

---

## 12. Logging

- Separate **application logging** (structured, leveled — via Winston or similar) from **HTTP access logging** (via Morgan or similar); they serve different purposes and often different audiences (developers vs. ops).
- Gate verbose access logs to development/staging; rely on the hosting platform's own request logs in production if it provides them, to avoid duplication.
- Route uncaught error logging through the same logger used elsewhere, so error logs aren't a separate, inconsistent stream.

---

## 13. Jobs & Scheduling

- **In-process cron** (e.g. `croner`, `node-cron`) is sufficient for a single-instance deployment with periodic tasks (e.g. daily payroll runs, nightly report generation). Simple to set up, but jobs don't survive a restart mid-run and don't coordinate across multiple instances — a job could run twice if scaled horizontally without added locking.
- **An external queue** (BullMQ + Redis, or a managed equivalent) becomes necessary once jobs must survive restarts, run across multiple worker instances without duplication, support retries/backoff, or need visibility into a job's status.
- **One-off scripts** (seeders, backfills, manual data-repair tools) belong in a `scripts/` folder that is *not* part of the server's normal boot path — they're invoked manually via a package script, not scheduled or auto-run.

---

## 14. Utilities

Common cross-cutting helpers worth centralizing rather than reimplementing per module:

- Async error wrapper for controllers.
- Encryption/hashing helpers.
- CSV/export helpers.
- Response-shaping helpers (if the API commits to a consistent envelope).
- Domain-specific validators (phone numbers, etc.).
- An object-property picker for building partial update payloads from validated request bodies.
- Rate limiter configuration, especially for auth endpoints.

---

## 15. API Documentation

- An OpenAPI/Swagger spec, built either from JSDoc comments scanned at build time or from hand-written path definition files, gives a machine-readable contract for the API. Hand-written path files are more verbose to maintain but don't require keeping comments in sync with code, and are easier to review as diffs.
- Mounting a Swagger UI route (commonly gated to non-production environments) turns the spec into interactive, browsable documentation — worth doing even if the spec is incomplete, since partial docs are still more useful than none.

---

## 16. TypeScript Configuration Notes

- **Strict mode should be fully enabled** (`strict`, `noImplicitAny`, `strictNullChecks`, etc.) from the start of a project — retrofitting strictness onto a large existing codebase is far more painful than starting with it on.
- Decide early between CommonJS and native ESM (`NodeNext` module resolution). Native ESM requires `.js` extensions on relative imports even in `.ts` source files, which trips up developers coming from CommonJS-only backgrounds — worth calling out in onboarding docs.
- Path aliases (e.g. `@/modules/*`) can reduce `../../../` chains, but only pay off if the team consistently uses them — a defined-but-unused alias is dead configuration.
- For local development, either a TypeScript execution loader (`ts-node`, `tsx`) with file-watching, or a `tsc --build` + `node --watch` combo works; production should always run compiled JavaScript rather than transpiling on the fly.

---

## 17. Request Lifecycle at a Glance

```
index.ts (bootstrap: connect DB, start server, init real-time layer, start jobs)
  → app.ts (global middleware pipeline)
    → routes/v1/index.ts (resource router aggregator)
      → routes/v1/<resource>.route.ts
        → auth middleware              [verify JWT, check permissions]
        → validation middleware        [validate & coerce request payload]
        → <feature>.controller.ts      [catchAsync-wrapped, thin]
          → <feature>.service.ts       [business logic, tenant scoping if applicable]
            → <feature>.model.ts       [Mongoose schema + shared plugins]
          ← response
    (on any thrown error) → error converter → centralized error handler
```

---

## 18. Common Architectural Pitfalls

A checklist worth revisiting periodically on any project following this pattern:

1. Security headers (CSP/Helmet) registered after routes instead of before — silently defeats them.
2. Sanitization middleware (XSS/NoSQL-injection) installed as a dependency but never wired into the middleware chain.
3. API spec built but never mounted, or mounted but not kept in sync with actual routes.
4. Manual per-service tenant scoping with no automated check (linter rule, test, or shared middleware) to catch a missing filter before it ships.
5. In-process cron jobs relied upon for correctness-critical work once the app scales to multiple instances, without any locking to prevent duplicate runs.
6. Config values read directly from `process.env` scattered across the codebase instead of funneled through the single validated config object.
