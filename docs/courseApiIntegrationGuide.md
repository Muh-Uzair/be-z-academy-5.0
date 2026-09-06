# Course API Integration Guide

This guide is the frontend contract for the course-management APIs currently implemented by the backend. All paths below are relative to the backend origin.

Base path: `/api/v1/courses`

## Integration rules

- `GET /` and `GET /:id` use `optionalAuth` — no `accessToken` cookie is required, but sending one changes what the caller sees (see [Role-based visibility](#role-based-visibility-list-endpoint) below). Every other route in this guide requires an authenticated session: send the `accessToken` cookie with credentials enabled (`fetch`: `credentials: "include"`; Axios: `withCredentials: true`).
- Success, validation, and application-error responses use `{ status, message, data }`, the same envelope as the auth APIs. See [`authApiIntegrationGuide.md`](./authApiIntegrationGuide.md) for the full envelope and status-code reference — it applies here unchanged.
- Strict validation is used: do not send fields that are not documented for that request. Body and query fields are validated separately; an undocumented field in either causes `400 Validation failed`.
- JSON request bodies are limited to 10 KB.
- Requests under `/api` are limited to 100 per IP per hour.
- Courses don't store raw images/videos. Uploading either is a two-step flow: get a presigned S3 upload URL from this API (API 1 / API 2), upload the file directly to S3 from the browser, then send the resulting object key as `thumbnailKey` / `videoKey` when creating/updating a course (API 3 / API 4).
- `videoUrl` returned in any course object is a **freshly signed, time-limited URL**. Do not cache or persist it — re-fetch the course to get a fresh one once it expires.

## Roles and access

| Route | Allowed caller |
| --- | --- |
| `POST /upload-thumbnail` | Instructor only |
| `POST /upload-video` | Instructor only |
| `POST /` | Instructor only (must have completed Stripe onboarding) |
| `PATCH /:id` | Instructor only (must own the course) |
| `DELETE /:id` | Instructor only (must own the course) |
| `PATCH /:id/verification` | Admin only |
| `POST /:id/payment-intent` | Student only |
| `POST /:id/refund` | Student only |
| `GET /:id/completion-status` | Student only |
| `GET /` | Public (role changes visibility, see below) |
| `GET /:id` | Public (no auth required) |

A caller with the wrong role receives `403 You do not have permission to perform this action`. A missing/invalid/expired `accessToken` cookie receives the same `401` errors documented for `/auth/me`.

## Course shape

Every course object returned by these APIs looks like:

```json
{
  "_id": "66d1a1b2c3d4e5f678901234",
  "title": "Complete Web Development Bootcamp",
  "description": "Learn frontend, backend, and full-stack web development from scratch.",
  "thumbnailUrl": "https://s3.<region>.amazonaws.com/<bucket>/5.0/courses/thumbnails/....jpg",
  "videoUrl": "https://s3.<region>.amazonaws.com/<bucket>/...?X-Amz-Signature=...",
  "price": 49.99,
  "level": "beginner",
  "instructor": "66c0a1b2c3d4e5f678901111",
  "category": "66c0a1b2c3d4e5f678901222",
  "isVerified": false,
  "verificationRejectionReason": null,
  "lastVerificationRejectedAt": null,
  "averageRating": 0,
  "totalReviews": 0,
  "totalStudentsEnrolled": 0,
  "totalDurationInMinutes": 0,
  "totalRevenueInstructor": 0,
  "totalRevenueAdmin": 0,
  "slug": "complete-web-development-bootcamp-a1b2c3d4",
  "createdAt": "2026-08-25T10:00:00.000Z",
  "updatedAt": "2026-08-25T10:00:00.000Z"
}
```

The raw `thumbnailKey` and `videoKey` are never exposed in responses — only the derived `thumbnailUrl` and `videoUrl`. In the list endpoint (API 7), `instructor` and `category` are replaced by joined `instructorDetails` and `categoryDetails` objects instead of raw ids.

`slug` is generated server-side from the title plus a random suffix — it cannot be set or changed by the client.

## API 1 — Get course thumbnail upload URL

`POST /api/v1/courses/upload-thumbnail`

Instructor only. Generates a presigned S3 POST policy for uploading a course thumbnail directly from the browser. Max file size 5 MB.

### Request body

```json
{
  "fileName": "bootcamp-thumbnail.jpg",
  "fileType": "image/jpeg"
}
```

| Field | Rules |
| --- | --- |
| `fileName` | Required, non-empty string. |
| `fileType` | Required, one of `"image/jpeg"` or `"image/png"`. |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Course thumbnail upload URL generated successfully",
  "data": {
    "uploadUrl": "https://s3.<region>.amazonaws.com/<bucket>/",
    "fields": {
      "key": "5.0/courses/thumbnails/<uuid>-bootcamp-thumbnail.jpg",
      "Content-Type": "image/jpeg",
      "policy": "...",
      "x-amz-signature": "..."
    },
    "key": "5.0/courses/thumbnails/<uuid>-bootcamp-thumbnail.jpg"
  }
}
```

### Using the response

1. Build a `FormData` from `data.fields`, appending the actual file last under the field name `file`.
2. POST that `FormData` directly to `data.uploadUrl` (no `accessToken` cookie needed for this S3 request — it's a different origin).
3. On success, keep `data.key` — send it as `thumbnailKey` in API 3 or API 4.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | `fileName` missing, or `fileType` is not `image/jpeg`/`image/png`. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an instructor. |

## API 2 — Get course video upload URL

`POST /api/v1/courses/upload-video`

Instructor only. Generates a presigned S3 POST policy for uploading a course video directly from the browser. Max file size 20 MB.

### Request body

```json
{
  "fileName": "intro-lecture.mp4",
  "fileType": "video/mp4"
}
```

| Field | Rules |
| --- | --- |
| `fileName` | Required, non-empty string. |
| `fileType` | Required, one of `"video/mp4"` or `"video/webm"`. |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Course video upload URL generated successfully",
  "data": {
    "uploadUrl": "https://s3.<region>.amazonaws.com/<bucket>/",
    "fields": {
      "key": "5.0/courses/videos/<uuid>-intro-lecture.mp4",
      "Content-Type": "video/mp4",
      "policy": "...",
      "x-amz-signature": "..."
    },
    "key": "5.0/courses/videos/<uuid>-intro-lecture.mp4"
  }
}
```

### Using the response

Same flow as API 1: upload the file to `data.uploadUrl` using `data.fields`, then send `data.key` as `videoKey` in API 3 or API 4.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | `fileName` missing, or `fileType` is not `video/mp4`/`video/webm`. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an instructor. |

## API 3 — Create course

`POST /api/v1/courses`

Instructor only. Requires the instructor to have completed Stripe Connect onboarding. `thumbnailKey`/`videoKey` must come from API 1/API 2. New courses always start with `isVerified: false`, pending admin review.

### Request body

```json
{
  "title": "Complete Web Development Bootcamp",
  "description": "Learn frontend, backend, and full-stack web development from scratch.",
  "price": 49.99,
  "level": "beginner",
  "category": "66c0a1b2c3d4e5f678901222",
  "thumbnailKey": "5.0/courses/thumbnails/<uuid>-bootcamp-thumbnail.jpg",
  "videoKey": "5.0/courses/videos/<uuid>-intro-lecture.mp4"
}
```

| Field | Rules |
| --- | --- |
| `title` | Required, trimmed, 5–120 characters. Must be unique per instructor. |
| `description` | Required, trimmed, 20–5000 characters. |
| `price` | Required, number, ≥ 0. |
| `level` | Required, one of `"beginner"`, `"intermediate"`, `"advanced"`. |
| `category` | Required, non-empty string (Category `_id`). |
| `thumbnailKey` | Required, non-empty string (S3 object key from API 1). |
| `videoKey` | Required, non-empty string (S3 object key from API 2). |

`instructor` is taken from the logged-in user, not the request body — do not send it. `slug` and `isVerified` are also server-managed and must not be sent.

### Success response

HTTP `201`

```json
{
  "status": "success",
  "message": "Course created successfully, it will be reviewed by an Admin",
  "data": {
    "course": { /* Course shape, see above */ }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | A field is missing, out of range, or an undocumented field is sent. |
| 400 | `"<value>" already exists. Please use a different title` | Instructor already has a course with this exact title. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an instructor. |
| 403 | `Please complete your Stripe onboarding before creating a course` | Instructor hasn't finished Stripe Connect onboarding. |
| 404 | `Instructor not found` | The logged-in instructor's user record is missing. |

## API 4 — Update course

`PATCH /api/v1/courses/:id`

Instructor only, and only the course's own instructor. All fields are optional, but at least one must be sent. If `thumbnailKey`/`videoKey` changes, the previous S3 object is deleted.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string (Mongo `_id`). |

### Request body

```json
{
  "price": 39.99,
  "level": "intermediate"
}
```

| Field | Rules |
| --- | --- |
| `title` | Optional, trimmed, 5–120 characters. |
| `description` | Optional, trimmed, 20–5000 characters. |
| `thumbnailKey` | Optional, non-empty string (S3 object key from API 1). |
| `videoKey` | Optional, non-empty string (S3 object key from API 2). |
| `price` | Optional, number, ≥ 0. |
| `level` | Optional, one of `"beginner"`, `"intermediate"`, `"advanced"`. |
| `category` | Optional, non-empty string (Category `_id`). |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Course updated successfully",
  "data": {
    "course": { /* Course shape, see above */ }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | Body is empty, a field fails its shape rules, or an undocumented field is sent. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to access this course` | Caller is not the course's owning instructor. |
| 404 | `Course not found` | No course exists with that `id`. |

## API 5 — Delete course

`DELETE /api/v1/courses/:id`

Instructor only, and only the course's own instructor. Deletes the course document and both its S3 objects (thumbnail + video).

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string. |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Course deleted successfully",
  "data": null
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Invalid value "<value>" for field "_id"` | `id` is not a valid Mongo ObjectId. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to access this course` | Caller is not the course's owning instructor. |
| 404 | `Course not found` | No course exists with that `id`. |

## API 6 — Approve or reject course (Admin)

`PATCH /api/v1/courses/:id/verification`

Admin only. `verificationRejectionReason` is required when `isVerified: false`. Rejecting redundantly (course is already in the target state) is rejected with an error.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string. |

### Request body

```json
{
  "isVerified": false,
  "verificationRejectionReason": "The intro video has no audio."
}
```

| Field | Rules |
| --- | --- |
| `isVerified` | Required, boolean. |
| `verificationRejectionReason` | Required when `isVerified: false` (1–500 characters); omit or send `null` when `isVerified: true`. |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Course approved successfully",
  "data": {
    "course": { /* Course shape, see above */ }
  }
}
```

`message` is `"Course rejected successfully"` when `isVerified: false`.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | `isVerified` missing, or rejecting without `verificationRejectionReason`. |
| 400 | `Course is already verified` | `isVerified: true` sent but the course is already verified. |
| 400 | `Course is already unverified` | `isVerified: false` sent but the course is already unverified. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an admin. |
| 404 | `Course not found` | No course exists with that `id`. |

## API 7 — List courses

`GET /api/v1/courses`

Uses `optionalAuth`. Returns a paginated, sortable, searchable list of courses. Visibility depends on the caller's role.

### Role-based visibility (list endpoint)

| Caller | Sees |
| --- | --- |
| Anonymous or Student | Only courses where `isVerified: true` and `verificationRejectionReason: null`. |
| Instructor | Only their own courses (including their own unverified/rejected ones). |
| Admin | All courses, no restriction. |

### Query parameters

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `search` | string | — | Case-insensitive search against `title`. |
| `projection` | string | — | Comma-separated Mongo field projection. |
| `instructor` | string | — | Filter by instructor `_id`. |
| `isVerified` | `"true" \| "false"` | — | Filter by verification state. |
| `verificationRejectionReason` | `"null"` | — | Literal string `"null"` — filters to courses where this field IS null. |
| `page` | number (≥1) | `1` | |
| `limit` | number (≥1) | `10` | |
| `sortBy` | string | `createdAt` | |
| `sortOrder` | `"asc" \| "desc"` | `desc` | |

All params are optional and sent as query-string values (strings); `page`/`limit` are coerced to numbers server-side.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Courses fetched successfully",
  "data": {
    "courses": [
      {
        "_id": "66d1a1b2c3d4e5f678901234",
        "title": "Complete Web Development Bootcamp",
        "description": "Learn frontend, backend, and full-stack web development from scratch.",
        "thumbnailUrl": "https://s3.<region>.amazonaws.com/<bucket>/5.0/courses/thumbnails/....jpg",
        "videoUrl": "https://s3.<region>.amazonaws.com/<bucket>/...?X-Amz-Signature=...",
        "price": 49.99,
        "level": "beginner",
        "instructorDetails": { "_id": "66c0a1b2c3d4e5f678901111", "fullName": "Jane Doe" },
        "categoryDetails": { "_id": "66c0a1b2c3d4e5f678901222", "name": "Web Development" },
        "isVerified": true,
        "verificationRejectionReason": null,
        "lastVerificationRejectedAt": null,
        "averageRating": 4.5,
        "totalReviews": 12,
        "totalStudentsEnrolled": 340,
        "totalDurationInMinutes": 480,
        "slug": "complete-web-development-bootcamp-a1b2c3d4",
        "createdAt": "2026-08-25T10:00:00.000Z",
        "updatedAt": "2026-08-25T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalDocuments": 12,
      "totalPages": 2,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

Note: `instructor` and `category` raw ids are replaced by joined `instructorDetails`/`categoryDetails` objects in this endpoint only.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | An invalid or undocumented query param is sent. |

## API 8 — Get course details

`GET /api/v1/courses/:id`

Uses `optionalAuth`, but applies **no visibility filtering** — any caller can fetch any course by id regardless of its verification status. Use API 7 if you need role-scoped visibility.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string (Mongo `_id`). |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Course details fetched successfully",
  "data": {
    "course": { /* Course shape, see above */ }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Invalid value "<value>" for field "_id"` | `id` is not a valid Mongo ObjectId. |
| 404 | `Course not found` | No course exists with that `id`. |

## API 9 — Create payment intent (Student)

`POST /api/v1/courses/:id/payment-intent`

Student only. Course must be verified, the student must not already be enrolled, and the course's instructor must have completed Stripe onboarding. Creates a Stripe `PaymentIntent` with the platform commission split off as an application fee, transferred to the instructor's connected Stripe account.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string (course `_id`). |

No request body.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Payment intent created successfully",
  "data": {
    "clientSecret": "pi_..._secret_..."
  }
}
```

Pass `data.clientSecret` to Stripe.js/Elements on the frontend to confirm the payment.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not a student. |
| 404 | `Course not found` | Course doesn't exist, or exists but is not verified. |
| 400 | `You are already enrolled in this course` | Student already has an enrollment for this course. |
| 400 | `This course's instructor has not completed payment onboarding yet` | Instructor hasn't finished Stripe Connect onboarding. |

## API 10 — Refund course (Student)

`POST /api/v1/courses/:id/refund`

Student only. All conditions below must hold; checked in order.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string (course `_id`). |

No request body.

### Behavior notes

- Refund window is 7 days from the payment date.
- Refund is blocked once the student has watched more than 30% of the course.
- On success, Stripe reverses the transfer to the instructor and refunds the platform's application fee — the student gets a full 100% refund.
- **The database is not updated synchronously.** Enrollment removal and transaction status happen asynchronously via the `charge.refunded` Stripe webhook. Don't assume the enrollment disappears immediately after this call returns — re-fetch or poll if you need to confirm.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Refund initiated successfully. Your money will be returned within 5-10 business days",
  "data": null
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not a student. |
| 404 | `You are not enrolled in this course` | No enrollment record for this student+course. |
| 404 | `No payment record found for this enrollment` | No transaction linked to the enrollment. |
| 400 | `This course has already been refunded` | Transaction is not in a `paid` state. |
| 400 | `This payment is not eligible for a refund` | `stripeChargeId` is missing on the transaction. |
| 400 | `Refund window has expired. Refunds are only allowed within 7 days of purchase` | More than 7 days since `amountPaidAt`. |
| 400 | `You have watched more than 30% of the course and are no longer eligible for a refund` | `enrollment.watchPercentage` exceeds 30%. |
| 500 | `Unable to process refund: no charge reference found` | Unexpected missing charge reference on the Stripe side. |

## API 11 — Get course completion status (Student)

`GET /api/v1/courses/:id/completion-status`

Student only. Requires an existing enrollment.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string (course `_id`). |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Course completion status fetched successfully",
  "data": {
    "completionPercentage": 62,
    "completed": false
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not a student. |
| 404 | `You are not enrolled in this course` | No enrollment record for this student+course. |

## Frontend types

Copy [`src/response-types/courseResponseTypes.ts`](../src/response-types/courseResponseTypes.ts) into the frontend project. It is a pure TypeScript file with no backend imports (it reuses `SuccessApiResponse`/`ApiErrorResponse` from [`authResponseTypes.ts`](../src/response-types/authResponseTypes.ts) and `Pagination` from [`userResponseTypes.ts`](../src/response-types/userResponseTypes.ts)) and exports `Course`, `CourseListItem` (the list-endpoint shape with joined `instructorDetails`/`categoryDetails`), and one response type per API above: `UploadCourseThumbnailResponse`, `UploadCourseVideoResponse`, `CreateCourseResponse`, `UpdateCourseResponse`, `DeleteCourseResponse`, `UpdateCourseVerificationResponse`, `CreateCoursePaymentIntentResponse`, `RequestCourseRefundResponse`, `GetCourseCompletionStatusResponse`, `GetCoursesResponse`, and `GetCourseDetailsResponse`.
