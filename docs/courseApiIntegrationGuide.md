# Course API Integration Guide

This guide is the frontend contract for the course-management APIs currently implemented by the backend. All paths below are relative to the backend origin.

Base path: `/api/v1/courses`

## Integration rules

- Every route in this guide requires an authenticated session, including `GET /` and `GET /:id`, **except `GET /public` and `GET /:id/public`**: send the `accessToken` cookie with credentials enabled (`fetch`: `credentials: "include"`; Axios: `withCredentials: true`). Anonymous callers are rejected with `401` on every other route.
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
| `GET /student/:id` | Admin or Instructor |
| `GET /instructor/:id` | Admin only |
| `POST /:id/payment-intent` | Student only |
| `POST /:id/refund` | Student only |
| `GET /:id/refund-eligibility` | Student only |
| `GET /:id/completion-status` | Student only |
| `GET /` | Any authenticated user (role changes visibility, see below) |
| `GET /public` | No authentication required |
| `GET /:id` | Admin, Instructor, or Student (must be logged in; role changes what's returned, see [API 8](#api-8--get-course-details)) |
| `GET /:id/public` | No authentication required |

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

The raw `thumbnailKey` and `videoKey` are never exposed in responses — only the derived `thumbnailUrl` and `videoUrl`. In the list endpoint (API 7) and the details endpoint (API 8), `instructor` and `category` are replaced by joined `instructorDetails` and `categoryDetails` objects instead of raw ids; every other endpoint returns them as raw ids.

`averageRating`/`totalReviews` are recalculated from the course's reviews every time one is created, updated, or deleted (see the [review guide](./reviewApiIntegrationGuide.md)). `totalStudentsEnrolled` increments when a purchase completes and decrements when it's refunded. `totalRevenueInstructor`/`totalRevenueAdmin` accumulate on each completed purchase and are reduced on refund. `totalDurationInMinutes` is set directly from the value sent on create ([API 3](#api-3--create-course)) or update ([API 4](#api-4--update-course)) — the backend never inspects the video file itself, so this value is only as accurate as what the frontend computed and sent.

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
  "videoKey": "5.0/courses/videos/<uuid>-intro-lecture.mp4",
  "totalDurationInMinutes": 42.5
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
| `totalDurationInMinutes` | Required, number, ≥ 0. |

`instructor` is taken from the logged-in user, not the request body — do not send it. `slug` and `isVerified` are also server-managed and must not be sent.

**`totalDurationInMinutes` must be read from the actual video file on the frontend, not typed in by the instructor.** Before uploading the video (API 2), read its duration client-side — e.g. loading it into an `HTMLVideoElement` and reading `.duration` (seconds), or via whatever video-picker library is in use — convert to minutes, and send that computed value here. The backend has no way to inspect the uploaded file's duration itself.

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
| `totalDurationInMinutes` | Required (number, ≥ 0) whenever `videoKey` is sent; omit otherwise. |
| `price` | Optional, number, ≥ 0. |
| `level` | Optional, one of `"beginner"`, `"intermediate"`, `"advanced"`. |
| `category` | Optional, non-empty string (Category `_id`). |

Same as [API 3](#api-3--create-course): `totalDurationInMinutes` must be read from the actual video file on the frontend (e.g. an `HTMLVideoElement`'s `.duration`), never typed in by the instructor — and only when a new `videoKey` is being sent, since it replaces the course's current value.

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

Admin only. `verificationRejectionReason` is required when `isVerified: false`.

- Approving (`isVerified: true`) is blocked only if the course is already verified. A previously-rejected course can always be approved — its `verificationRejectionReason` is cleared to `null` in the process.
- Rejecting (`isVerified: false`) is blocked only if the course is already sitting in a rejected state (`isVerified: false` with a `verificationRejectionReason` already recorded). A currently-verified course can always be rejected — a fresh, never-reviewed course (`isVerified: false`, `verificationRejectionReason: null`) can also always be rejected for the first time.

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
| 400 | `Course is already unverified` | `isVerified: false` sent but the course is already unverified with a rejection reason already on record (i.e. it was already rejected, not just pending its first review). |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an admin. |
| 404 | `Course not found` | No course exists with that `id`. |

## API 7 — List courses

`GET /api/v1/courses`

Requires an authenticated session — anonymous callers are rejected with `401`. Returns a paginated, sortable, searchable list of courses. Visibility depends on the caller's role.

### Role-based visibility (list endpoint)

| Caller | Sees |
| --- | --- |
| Student | Only courses they are enrolled in. |
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
| `status` | `"verified" \| "rejected" \| "pendingReview"` | — | Filter by derived review status (see below). Combines with `isVerified`/`verificationRejectionReason` via AND if sent together. |
| `page` | number (≥1) | `1` | |
| `limit` | number (≥1) | `10` | |
| `sortBy` | string | `createdAt` | |
| `sortOrder` | `"asc" \| "desc"` | `desc` | |

`status` maps to a combination of `isVerified` and `verificationRejectionReason`:

| `status` | Meaning |
| --- | --- |
| `verified` | `isVerified: true` and `verificationRejectionReason: null` |
| `rejected` | `isVerified: false` and `verificationRejectionReason` is not `null` |
| `pendingReview` | `isVerified: false` and `verificationRejectionReason: null` |

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
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |

## API 8 — Get course details

`GET /api/v1/courses/:id`

Requires an authenticated session (unlike `GET /`, anonymous callers are rejected with `401`). What's returned depends on the caller's role.

### Role-based behavior (details endpoint)

Every role gets the same joined shape back — `instructorDetails`/`categoryDetails` instead of raw `instructor`/`category` (same as an [API 7](#api-7--list-courses) list item) — but who can reach it differs:

| Caller | Sees | On a course that isn't theirs / isn't accessible |
| --- | --- | --- |
| Admin | Any course, full details. | `404 Course not found` if the `id` doesn't exist. |
| Instructor | Full details, but only for a course they own. | `404 Course not found` if the `id` doesn't exist; `403 You do not have permission to access this course` if it exists but belongs to another instructor. |
| Student | Full details, but only for a course they're enrolled in. | `404 You are not enrolled in this course` if there's no enrollment for this student+course (including when the course itself doesn't exist). |

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string (Mongo `_id`). |

### Success response

HTTP `200`

`course` uses the joined shape (`instructorDetails`/`categoryDetails` instead of raw `instructor`/`category`, same as an [API 7](#api-7--list-courses) list item), for every role:

```json
{
  "status": "success",
  "message": "Course details fetched successfully",
  "data": {
    "course": {
      "_id": "66d1a1b2c3d4e5f678901234",
      "title": "Complete Web Development Bootcamp",
      "thumbnailUrl": "https://s3.<region>.amazonaws.com/<bucket>/5.0/courses/thumbnails/....jpg",
      "videoUrl": "https://s3.<region>.amazonaws.com/<bucket>/...?X-Amz-Signature=...",
      "instructorDetails": { "_id": "66c0a1b2c3d4e5f678901111", "fullName": "Jane Doe" },
      "categoryDetails": { "_id": "66c0a1b2c3d4e5f678901222", "name": "Web Development" }
      /* ...remaining Course fields, see above */
    }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Invalid value "<value>" for field "_id"` | `id` is not a valid Mongo ObjectId. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to access this course` | Caller is an instructor and the course belongs to someone else. |
| 404 | `Course not found` | Caller is an admin/instructor and no course exists with that `id`. |
| 404 | `You are not enrolled in this course` | Caller is a student with no enrollment for this course (also returned when the `id` doesn't exist at all). |

## API 12 — List public courses

`GET /api/v1/courses/public`

No authentication required — no `accessToken` cookie needed. Always scoped to verified courses only (`isVerified: true` and `verificationRejectionReason: null`). Does **not** return `videoUrl` (no signed URL is generated for anonymous traffic). Optionally filter by `category`.

### Query parameters

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `search` | string | — | Case-insensitive search against `title`. |
| `category` | string | — | Filter by category `_id`. |
| `page` | number (≥1) | `1` | |
| `limit` | number (≥1) | `10` | |

No other query params are accepted (`400 Validation failed` if sent) — results are always sorted by `createdAt` descending.

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

Note the absence of `videoUrl` compared to the [API 7](#api-7--list-courses) shape.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | An invalid or undocumented query param is sent. |

## API 13 — Get public course details

`GET /api/v1/courses/:id/public`

No authentication required. Always scoped to verified courses only (`isVerified: true` and `verificationRejectionReason: null`) — a rejected/pending course, or one that doesn't exist, returns `404`. Does **not** return `videoUrl`.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string (Mongo `_id`). |

### Success response

HTTP `200`

`course` uses the joined shape (`instructorDetails`/`categoryDetails`, same as [API 12](#api-12--list-public-courses)), without `videoUrl`:

```json
{
  "status": "success",
  "message": "Course details fetched successfully",
  "data": {
    "course": {
      "_id": "66d1a1b2c3d4e5f678901234",
      "title": "Complete Web Development Bootcamp",
      "thumbnailUrl": "https://s3.<region>.amazonaws.com/<bucket>/5.0/courses/thumbnails/....jpg",
      "instructorDetails": { "_id": "66c0a1b2c3d4e5f678901111", "fullName": "Jane Doe" },
      "categoryDetails": { "_id": "66c0a1b2c3d4e5f678901222", "name": "Web Development" }
      /* ...remaining Course fields, see above — no videoUrl */
    }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Invalid value "<value>" for field "_id"` | `id` is not a valid Mongo ObjectId. |
| 404 | `Course not found` | No verified course exists with that `id` (also returned for a rejected/pending course). |

## API 9 — Create payment intent (Student)

`POST /api/v1/courses/:id/payment-intent`

Student only. Course must be verified, the student must not already be enrolled, and the course's instructor must have completed Stripe onboarding. Creates a Stripe `PaymentIntent` with the platform commission split off as an application fee, transferred to the instructor's connected Stripe account.

Calling this again for the same course **always issues a brand-new `clientSecret`**, even if a previous call for the same course was abandoned without paying: any prior unpaid `PaymentIntent` for this student+course is canceled on Stripe and its local record is superseded before the new one is created. Don't cache a `clientSecret` across calls — always use the one from the latest response, and discard the Stripe Elements instance tied to an earlier one.

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
- A duplicate/double-click refund request for the same course is rejected outright with `400 A refund for this course is already being processed` — the first request atomically claims the transaction before calling Stripe, so a second concurrent call never reaches Stripe.

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
| 400 | `This course has already been refunded` | Transaction is not in a `paid` state (already refunded, or Stripe reports the charge as already refunded). |
| 400 | `This payment is not eligible for a refund` | Transaction is not in a `paid` state for another reason (e.g. still `pending`/`failed`). |
| 400 | `Refund window has expired. Refunds are only allowed within 7 days of purchase` | More than 7 days since `amountPaidAt`. |
| 400 | `You have watched more than 30% of the course and are no longer eligible for a refund` | `enrollment.watchPercentage` exceeds 30%. |
| 400 | `A refund for this course is already being processed` | Another refund request for the same transaction is already in flight (e.g. a duplicate/double-click call). |
| 500 | `Unable to process refund: no charge reference found` | `stripeChargeId` is missing on the transaction. |
| 500 | `Unable to process refund. Please try again later` | Stripe rejected the refund for a reason other than "already refunded". |

## API 10a — Get refund eligibility (Student)

`GET /api/v1/courses/:id/refund-eligibility`

Student only. Read-only check — runs the exact same rules as [API 10](#api-10--refund-course-student) (payment state, 7-day window, 30% watch limit) without claiming the transaction or calling Stripe. Use it to show/hide a "Request refund" button and explain why it's disabled, before the student actually submits a refund request.

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
  "message": "Refund eligibility fetched successfully",
  "data": {
    "eligibility": {
      "eligible": false,
      "reason": "You have watched more than 30% of the course and are no longer eligible for a refund",
      "paymentStatus": "paid",
      "watchPercentage": 45,
      "daysSincePurchase": 2.31,
      "daysRemaining": 5
    }
  }
}
```

| Field | Notes |
| --- | --- |
| `eligible` | `true` only if a refund request would currently succeed. |
| `reason` | Human-readable explanation when `eligible: false`; `null` when `eligible: true`. |
| `paymentStatus` | The transaction's current `paymentStatus` (`"paid"`, `"refund_processing"`, `"refunded"`, etc.). |
| `watchPercentage` | The enrollment's current watch percentage. |
| `daysSincePurchase` | Days elapsed since `amountPaidAt`; `null` if the transaction was never `paid` (e.g. still `pending`/`failed`). |
| `daysRemaining` | Days left in the 7-day refund window (floored at 0); `null` under the same condition as `daysSincePurchase`. |

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not a student. |
| 404 | `You are not enrolled in this course` | No enrollment record for this student+course. |
| 404 | `No payment record found for this enrollment` | No transaction linked to the enrollment. |

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

## API 14 — List an instructor's courses (Admin)

`GET /api/v1/courses/instructor/:id`

Admin only. Returns a paginated, sortable, searchable list of all courses belonging to a specific instructor, identified by their user `_id`. Accepts the same query parameters as [API 7](#api-7--list-courses) and returns the same joined response shape.

This is the admin mirror of `GET /api/v1/courses/student/:id` — it impersonates the target instructor's role when scoping the query, so the admin sees exactly what that instructor would see on their own `GET /courses` call.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string (Mongo `_id` of the instructor). |

### Query parameters

Identical to [API 7](#api-7--list-courses):

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `search` | string | — | Case-insensitive search against `title`. |
| `projection` | string | — | Comma-separated Mongo field projection. |
| `instructor` | string | — | Filter by instructor `_id`. |
| `isVerified` | `"true" \| "false"` | — | Filter by verification state. |
| `verificationRejectionReason` | `"null"` | — | Filters to courses where this field IS null. |
| `status` | `"verified" \| "rejected" \| "pendingReview"` | — | Filter by derived review status. |
| `page` | number (≥1) | `1` | |
| `limit` | number (≥1) | `10` | |
| `sortBy` | string | `createdAt` | |
| `sortOrder` | `"asc" \| "desc"` | `desc` | |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Instructor's courses fetched successfully",
  "data": {
    "courses": [
      {
        "_id": "66d1a1b2c3d4e5f678901234",
        "title": "Complete Web Development Bootcamp",
        "thumbnailUrl": "https://s3.<region>.amazonaws.com/<bucket>/5.0/courses/thumbnails/....jpg",
        "videoUrl": "https://s3.<region>.amazonaws.com/<bucket>/...?X-Amz-Signature=...",
        "price": 49.99,
        "level": "beginner",
        "instructorDetails": { "_id": "66c0a1b2c3d4e5f678901111", "fullName": "Jane Doe" },
        "categoryDetails": { "_id": "66c0a1b2c3d4e5f678901222", "name": "Web Development" },
        "isVerified": false,
        "verificationRejectionReason": null,
        "averageRating": 0,
        "totalReviews": 0,
        "totalStudentsEnrolled": 0,
        "totalDurationInMinutes": 42,
        "slug": "complete-web-development-bootcamp-a1b2c3d4",
        "createdAt": "2026-08-25T10:00:00.000Z",
        "updatedAt": "2026-08-25T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalDocuments": 5,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

Includes **all** of the instructor's courses — verified, rejected, and pending review — since the admin is impersonating the instructor's scope with no extra filtering. Use the `status` or `isVerified` query params to narrow to a specific subset.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | An invalid or undocumented query param is sent, or `id` is missing. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an admin. |

## API 15 — List a student's courses (Admin or Instructor)

`GET /api/v1/courses/student/:id`

Admin or Instructor. Returns a paginated, sortable, searchable list of courses a specific student is enrolled in, identified by their user `_id`. Accepts the same query parameters as [API 7](#api-7--list-courses) and returns the same joined response shape.

Admins see all courses the student is enrolled in. Instructors see only the courses where both of these conditions are true:

- The requested student is enrolled in the course.
- The authenticated instructor owns the course.

An instructor cannot use this endpoint to view the student's courses belonging to another instructor.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string (Mongo `_id` of the student). |

### Query parameters

Identical to [API 7](#api-7--list-courses):

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `search` | string | — | Case-insensitive search against `title`. |
| `projection` | string | — | Comma-separated Mongo field projection. |
| `instructor` | string | — | Filter by instructor `_id`. |
| `isVerified` | `"true" \| "false"` | — | Filter by verification state. |
| `verificationRejectionReason` | `"null"` | — | Filters to courses where this field IS null. |
| `status` | `"verified" \| "rejected" \| "pendingReview"` | — | Filter by derived review status. |
| `page` | number (≥1) | `1` | |
| `limit` | number (≥1) | `10` | |
| `sortBy` | string | `createdAt` | |
| `sortOrder` | `"asc" \| "desc"` | `desc` | |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Student's courses fetched successfully",
  "data": {
    "courses": [
      {
        "_id": "66d1a1b2c3d4e5f678901234",
        "title": "Complete Web Development Bootcamp",
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
      "totalDocuments": 5,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

Includes **all** of the courses the student is enrolled in.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | An invalid or undocumented query param is sent, or `id` is missing. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an admin or instructor. |

## Frontend types

Copy [`src/response-types/courseResponseTypes.ts`](../src/response-types/courseResponseTypes.ts) into the frontend project. It is a pure TypeScript file with no backend imports (it reuses `SuccessApiResponse`/`ApiErrorResponse` from [`authResponseTypes.ts`](../src/response-types/authResponseTypes.ts) and `Pagination` from [`userResponseTypes.ts`](../src/response-types/userResponseTypes.ts)) and exports `Course`, `CourseListItem` (the list-endpoint shape with joined `instructorDetails`/`categoryDetails`), and one response type per API above: `UploadCourseThumbnailResponse`, `UploadCourseVideoResponse`, `CreateCourseResponse`, `UpdateCourseResponse`, `DeleteCourseResponse`, `UpdateCourseVerificationResponse`, `CreateCoursePaymentIntentResponse`, `RequestCourseRefundResponse`, `CourseRefundEligibility`, `GetCourseRefundEligibilityResponse`, `GetCourseCompletionStatusResponse`, `GetCoursesResponse`, `GetCourseDetailsResponse`, `GetPublicCoursesResponse`, `GetPublicCourseDetailsResponse`, `GetInstructorCoursesResponse`, and `GetStudentCoursesResponse`.
