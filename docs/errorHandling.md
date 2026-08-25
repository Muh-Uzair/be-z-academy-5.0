# Error handling in this app

This document describes how errors are handled across the application and shows example JSON responses that clients receive.

Relevant code:

- [errorController.ts](</C:/Users/Muhammad Uzair/Desktop/be-z-academy-5.0/src/controllers/errorController.ts>) — global error handler that centralizes and normalizes errors before sending responses.
- [validation middleware](</C:/Users/Muhammad Uzair/Desktop/be-z-academy-5.0/src/middlewares/validation.ts>) — converts Zod validation failures into AppError instances.
- [AppError class](</C:/Users/Muhammad Uzair/Desktop/be-z-academy-5.0/src/utils/appError.ts>) — application-level error wrapper used for operational errors.
- [sendResponse util](</C:/Users/Muhammad Uzair/Desktop/be-z-academy-5.0/src/utils/sendResponse.ts>) — responsible for JSON response shape.

Overview
--------

- All controller / route code should `throw` or `next()` an `AppError` for expected, operational errors (bad request, not found, unauthorized, etc.).
- Mongoose / MongoDB errors are normalized by the global error handler into `AppError` instances so responses are consistent.
- Zod validation errors are intercepted by request validation middleware which creates `AppError(400, "Validation failed", { errors })` with a structured `errors` array. The global error handler then sends that AppError unchanged.
- Any unknown (programming) errors are logged on the server and a generic 500 response is returned (no internal details leaked to clients).

Response shape
--------------

All responses produced by the global error handler use the `sendResponse` utility and follow this JSON structure:

{
  "status": "success" | "fail" | "error",
  "message": "string",
  "data": <any | null>
}

- `status` will be `fail` for 4xx (client) errors and `error` for 5xx (server) errors (see `AppError` logic).
- `data` is used for structured error details when available (for example, validation issues).

Handled error types and examples
--------------------------------

1) Zod validation errors (request validation middleware)
------------------------------------------------------

Where it is handled: [src/middlewares/validation.ts](</C:/Users/Muhammad Uzair/Desktop/be-z-academy-5.0/src/middlewares/validation.ts>)

Behavior:
- The middleware uses `schema.safeParse(req[source])`.
- If parsing fails it maps Zod issues into an array of `{ field, message }` and calls `next(new AppError(400, "Validation failed", { errors }))`.
- The global error handler sends that AppError as-is.

Example response (HTTP 400):

{
  "status": "fail",
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "email", "message": "Invalid email" },
      { "field": "password", "message": "Password must be at least 8 characters" }
    ]
  }
}

Notes:
- `field` values are joined Zod paths (e.g. `address.street`), see middleware mapping.


2) Mongoose validation errors
-----------------------------

Where it is handled: [src/controllers/errorController.ts](</C:/Users/Muhammad Uzair/Desktop/be-z-academy-5.0/src/controllers/errorController.ts>) — `handleMongooseValidationError`

Behavior:
- When Mongoose throws `mongoose.Error.ValidationError`, the global handler converts it into `new AppError(400, "Validation failed", { errors })` where `errors` is an array of `{ field, message }` extracted from the Mongoose error.
- Response shape is the same as Zod validation errors (HTTP 400).

Example response (HTTP 400):

{
  "status": "fail",
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "title", "message": "Path `title` is required." },
      { "field": "price", "message": "Cast to Number failed for value \"abc\" at path \"price\"" }
    ]
  }
}


3) Duplicate key / E11000 (unique index violation)
--------------------------------------------------

Where it is handled: [src/controllers/errorController.ts](</C:/Users/Muhammad Uzair/Desktop/be-z-academy-5.0/src/controllers/errorController.ts>) — the code checks `(err as { code?: number }).code === 11000` and calls `handleDuplicateKeyError`.

Behavior:
- The duplicate-key handler extracts the field name and the offending value from `err.keyValue` and returns an `AppError(400, '"value" already exists. Please use a different field')`.
- `data` is not set (null) for duplicate key responses in current implementation.

Example response (HTTP 400):

{
  "status": "fail",
  "message": "\"someone@example.com\" already exists. Please use a different email",
  "data": null
}

Example raw Mongo error that triggers this handler (for reference):

{
  "index": 0,
  "code": 11000,
  "keyPattern": { "email": 1 },
  "keyValue": { "email": "someone@example.com" },
  "errmsg": "E11000 duplicate key error collection: db.users index: email_1 dup key: { : \"someone@example.com\" }"
}


4) Mongoose CastError (invalid ObjectId or bad cast)
---------------------------------------------------

Where it is handled: [src/controllers/errorController.ts](</C:/Users/Muhammad Uzair/Desktop/be-z-academy-5.0/src/controllers/errorController.ts>) — `handleCastError`

Behavior:
- Converts `mongoose.Error.CastError` into `AppError(400, 'Invalid value "..." for field "..."')`.

Example response (HTTP 400):

{
  "status": "fail",
  "message": "Invalid value \"abc123\" for field \"_id\"",
  "data": null
}


5) AppError (operational application errors)
-------------------------------------------

Where it originates: anywhere in application code (controllers, services) can `throw new AppError(statusCode, message, data)`.

Behavior:
- The global handler recognizes `err instanceof AppError` and sends it through unchanged.
- This is the recommended way to represent expected / operational errors (e.g. 404 Not Found, 401 Unauthorized, 400 Bad Request with domain-specific details).

Example response (HTTP 404):

{
  "status": "fail",
  "message": "Course not found",
  "data": null
}

Example response with additional data (HTTP 403):

{
  "status": "fail",
  "message": "Forbidden: cannot modify this resource",
  "data": { "requiredRole": "admin" }
}


6) Programming / unknown errors (internal server errors)
--------------------------------------------------------

Behavior:
- Any error not converted to a known operational `AppError` (and not a recognized Mongoose error) is treated as a programming/unknown error.
- These errors are logged server-side (see `console.error("PROGRAMMING ERROR:", err)` in [errorController.ts](</C:/Users/Muhammad Uzair/Desktop/be-z-academy-5.0/src/controllers/errorController.ts>)).
- The client receives a generic 500 response with no stack trace or internal details.

Example response (HTTP 500):

{
  "status": "error",
  "message": "Something went wrong. Please try again later.",
  "data": null
}


Implementation notes and recommendations
---------------------------------------

- The canonical source of truth for the response shape is [src/utils/sendResponse.ts](</C:/Users/Muhammad Uzair/Desktop/be-z-academy-5.0/src/utils/sendResponse.ts>).
- Use `AppError` for all expected client-facing errors to ensure a consistent API contract.
- Validation middleware already converts Zod errors into `AppError(400, "Validation failed", { errors })`. Continue to rely on that pattern for any other schema validation library (map validation failures to the same shape).
- If additional error types (for example, `ZodError` directly or custom library errors) need special handling, add converter functions to [src/controllers/errorController.ts](</C:/Users/Muhammad Uzair/Desktop/be-z-academy-5.0/src/controllers/errorController.ts>) alongside the existing `handleCastError` / `handleDuplicateKeyError` / `handleMongooseValidationError` functions.

Summary
-------

- The app centralizes error normalization in a single global error handler so clients always receive a predictable JSON shape.
- Validation failures (Zod or Mongoose) become 400 `fail` responses with a structured `errors` array for easy machine parsing.
- Duplicate-key (E11000) and cast errors become friendly 400 messages.
- Unknown errors are logged and converted to a safe 500 `error` response.

If any specific example responses or additional error types should be added (for example third-party service errors, JWT errors, or custom domain errors), reply with which error type to document and example scenarios and those will be included.
