# Course API Integration Guide

This guide is the frontend contract for the course-management APIs currently implemented by the backend. All paths below are relative to the backend origin.

Base path: `/api/v1/courses`

## Integration rules

- Every route in this guide requires an authenticated session, including `GET /` and `GET /:id`, **except `GET /featured`, `GET /trending`, `GET /public` and `GET /:id/public`**: send the `accessToken` cookie with credentials enabled (`fetch`: `credentials: "include"`; Axios: `withCredentials: true`). Anonymous callers are rejected with `401` on every other route.
- Success, validation, and application-error responses use `{ status, message, data }`, the same envelope as the auth APIs. See [`authApiIntegrationGuide.md`](./authApiIntegrationGuide.md) for the full envelope and status-code reference — it applies here unchanged.
- Strict validation is used: do not send fields that are not documented for that request. Body and query fields are validated separately; an undocumented field in either causes `400 Validation failed`.
- JSON request bodies are limited to 10 KB.
- Requests under `/api` are limited to 5000 per IP per hour.
- Courses don't store raw images/videos. Uploading either is a two-step flow: get a presigned S3 upload URL from this API (API 2 / API 3), upload the file directly to S3 from the browser, then send the resulting object key as `thumbnailKey` / `videoKey` when creating/updating a course (API 4 / API 5).
- `videoUrl` returned in any course object is a **freshly signed, time-limited URL** (valid for 1 hour). Do not cache or persist it — re-fetch the course to get a fresh one once it expires.
- Ids are not validated as ObjectIds up front. Where an endpoint below lists `500` for a malformed id, the backend currently fails with `500 Something went wrong. Please try again later.` instead of a `400`; only send real `_id` values.

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
| `GET /instructor/:id` | Admin or Student |
| `POST /:id/payment-intent` | Student only |
| `POST /:id/refund` | Student only |
| `GET /:id/refund-eligibility` | Student only |
| `GET /:id/completion-status` | Student only |
| `GET /:id/issue-certificate` | Student only |
| `GET /` | Any authenticated user (role changes visibility, see below) |
| `GET /featured` | No authentication required |
| `GET /trending` | No authentication required |
| `GET /public` | No authentication required |
| `GET /:id` | Admin, Instructor, or Student (must be logged in; role changes what's returned, see [API 19](#api-19--get-course-details)) |
| `GET /:id/public` | No authentication required |

A caller with the wrong role receives `403 You do not have permission to perform this action`. A missing/invalid/expired `accessToken` cookie receives the same `401` errors documented for `/auth/me`.

## Course shape

Every course object returned by these APIs looks like:

```json
{
  "_id": "66d1a1b2c3d4e5f678901234",
  "title": "Complete Web Development Bootcamp",
  "description": "Learn frontend, backend, and full-stack web development from scratch.",
  "thumbnailUrl": "https://s3.<region>.amazonaws.com/<bucket>/5.0/courses/thumbnails/<uuid>-bootcamp-thumbnail.jpeg",
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

The raw `thumbnailKey` and `videoKey` are never exposed in responses — only the derived `thumbnailUrl` and `videoUrl`. This raw-id shape (`instructor`/`category` as ids) is returned only by verification, create and update (API 1, 4, 5); every list/details endpoint returns the joined shape below.

## Joined course shape

Returned by every list/details endpoint: API 12, 13, 14 and 19 (with `videoUrl`) and API 15, 16, 17 and 18 (the public ones: without `videoUrl` and without the revenue/review-note fields, see the list below the example). `instructor` and `category` are replaced by joined `instructorDetails` and `categoryDetails` objects:

```json
{
  "_id": "66d1a1b2c3d4e5f678901234",
  "title": "Complete Web Development Bootcamp",
  "description": "Learn frontend, backend, and full-stack web development from scratch.",
  "price": 49.99,
  "level": "beginner",
  "isVerified": true,
  "verificationRejectionReason": null,
  "lastVerificationRejectedAt": null,
  "averageRating": 4.5,
  "totalReviews": 12,
  "totalStudentsEnrolled": 340,
  "totalDurationInMinutes": 480,
  "totalRevenueInstructor": 16146.6,
  "totalRevenueAdmin": 850,
  "slug": "complete-web-development-bootcamp-a1b2c3d4",
  "createdAt": "2026-08-25T10:00:00.000Z",
  "updatedAt": "2026-08-25T10:00:00.000Z",
  "instructorDetails": {
    "_id": "66c0a1b2c3d4e5f678901111",
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "bio": "Backend engineering instructor",
    "highestEducation": "Master's degree",
    "yearsOfExperience": 6,
    "isVerified": true,
    "role": "instructor",
    "createdAt": "2026-08-01T10:00:00.000Z",
    "updatedAt": "2026-08-01T10:00:00.000Z",
    "avatar": null
  },
  "categoryDetails": {
    "_id": "66c0a1b2c3d4e5f678901222",
    "name": "Web Development",
    "description": "Courses covering frontend, backend, and full-stack web development.",
    "createdAt": "2026-07-01T10:00:00.000Z",
    "updatedAt": "2026-07-01T10:00:00.000Z"
  },
  "thumbnailUrl": "https://s3.<region>.amazonaws.com/<bucket>/5.0/courses/thumbnails/<uuid>-bootcamp-thumbnail.jpeg",
  "videoUrl": "https://s3.<region>.amazonaws.com/<bucket>/5.0/courses/videos/<uuid>-intro-lecture.mp4?X-Amz-Algorithm=...&X-Amz-Signature=..."
}
```

- `instructorDetails` has the same public fields as the auth guide's `AuthUser` (no `stripeOnboardingComplete`); `categoryDetails` has every category field except the image (no `imageKey`/`imageUrl`).
- The authenticated endpoints (API 12, 13, 14, 19) include every course field above.
- The **public** endpoints (API 15, 16, 17, 18) return the same shape without `videoUrl` and **also without** `totalRevenueInstructor`, `totalRevenueAdmin`, `verificationRejectionReason` and `lastVerificationRejectedAt` — the financial totals and the admin's review notes are never exposed publicly. (They only list verified courses, so those two review fields would always be `null` anyway.)

`averageRating`/`totalReviews` are recalculated from the course's reviews every time one is created, updated, or deleted (see the [review guide](./reviewApiIntegrationGuide.md)). `totalStudentsEnrolled` increments when a purchase completes and decrements when it's refunded. `totalRevenueInstructor`/`totalRevenueAdmin` accumulate on each completed purchase and are reduced on refund. `totalDurationInMinutes` is set directly from the value sent on create ([API 4](#api-4--create-course)) or update ([API 5](#api-5--update-course)) — the backend never inspects the video file itself, so this value is only as accurate as what the frontend computed and sent.

`slug` is generated server-side from the title plus a random suffix — it cannot be set or changed by the client.

## API 1 — Approve or reject course (Admin)

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
| 400 | `Invalid value "<value>" for field "_id"` | `id` is not a valid Mongo ObjectId. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an admin. |
| 404 | `Course not found` | No course exists with that `id`. |

## API 2 — Get course thumbnail upload URL

`POST /api/v1/courses/upload-thumbnail`

Instructor only. Generates a presigned S3 POST policy for uploading a course thumbnail directly from the browser. Max file size 5 MB. The policy expires after 15 minutes and requires the uploaded `Content-Type` to equal `fileType`. The key is `5.0/courses/thumbnails/<uuid>-<fileName without extension>.<jpeg|png>` — the extension always comes from `fileType`.

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
    "uploadUrl": "https://s3.<region>.amazonaws.com/<bucket>",
    "fields": {
      "Content-Type": "image/jpeg",
      "bucket": "<bucket>",
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": "...",
      "X-Amz-Date": "20260825T100000Z",
      "key": "5.0/courses/thumbnails/<uuid>-bootcamp-thumbnail.jpeg",
      "Policy": "...",
      "X-Amz-Signature": "..."
    },
    "key": "5.0/courses/thumbnails/<uuid>-bootcamp-thumbnail.jpeg"
  }
}
```

### Using the response

1. Build a `FormData` from `data.fields`, appending the actual file last under the field name `file`.
2. POST that `FormData` directly to `data.uploadUrl` (no `accessToken` cookie needed for this S3 request — it's a different origin). S3 answers `204 No Content` on success.
3. On success, keep `data.key` — send it as `thumbnailKey` in API 4 or API 5.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | `fileName` missing, or `fileType` is not `image/jpeg`/`image/png`. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an instructor. |

## API 3 — Get course video upload URL

`POST /api/v1/courses/upload-video`

Instructor only. Generates a presigned S3 POST policy for uploading a course video directly from the browser. Max file size 20 MB. The policy expires after 15 minutes and requires the uploaded `Content-Type` to equal `fileType`. The key is `5.0/courses/videos/<uuid>-<fileName without extension>.<mp4|webm>`.

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
    "uploadUrl": "https://s3.<region>.amazonaws.com/<bucket>",
    "fields": {
      "Content-Type": "video/mp4",
      "bucket": "<bucket>",
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": "...",
      "X-Amz-Date": "20260825T100000Z",
      "key": "5.0/courses/videos/<uuid>-intro-lecture.mp4",
      "Policy": "...",
      "X-Amz-Signature": "..."
    },
    "key": "5.0/courses/videos/<uuid>-intro-lecture.mp4"
  }
}
```

### Using the response

Same flow as API 2: upload the file to `data.uploadUrl` using `data.fields`, then send `data.key` as `videoKey` in API 4 or API 5.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | `fileName` missing, or `fileType` is not `video/mp4`/`video/webm`. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an instructor. |

## API 4 — Create course

`POST /api/v1/courses`

Instructor only. Requires the instructor to have completed Stripe Connect onboarding — i.e. `stripeOnboardingComplete: true`, which only the Stripe `account.updated` webhook sets (see the user guide's onboarding-link API). `thumbnailKey`/`videoKey` must come from API 2/API 3. New courses always start with `isVerified: false`, pending admin review.

### Request body

```json
{
  "title": "Complete Web Development Bootcamp",
  "description": "Learn frontend, backend, and full-stack web development from scratch.",
  "price": 49.99,
  "level": "beginner",
  "category": "66c0a1b2c3d4e5f678901222",
  "thumbnailKey": "5.0/courses/thumbnails/<uuid>-bootcamp-thumbnail.jpeg",
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
| `thumbnailKey` | Required, non-empty string (S3 object key from API 2). |
| `videoKey` | Required, non-empty string (S3 object key from API 3). |
| `totalDurationInMinutes` | Required, number, ≥ 0. |

`price` and `totalDurationInMinutes` may also be sent as numeric strings (e.g. `"49.99"`); they are coerced to numbers.

`instructor` is taken from the logged-in user, not the request body — do not send it. `slug` and `isVerified` are also server-managed and must not be sent.

The backend does not check that `category` refers to an existing category: a malformed id fails with `400 Validation failed` (a database cast error on `category`), but a well-formed id of a non-existent category is accepted. Always send an `_id` taken from the category APIs.

**`totalDurationInMinutes` must be read from the actual video file on the frontend, not typed in by the instructor.** Before uploading the video (API 3), read its duration client-side — e.g. loading it into an `HTMLVideoElement` and reading `.duration` (seconds), or via whatever video-picker library is in use — convert to minutes, and send that computed value here. The backend has no way to inspect the uploaded file's duration itself.

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

## API 5 — Update course

`PATCH /api/v1/courses/:id`

Instructor only, and only the course's own instructor. All fields are optional, but at least one must be sent. If `thumbnailKey`/`videoKey` changes, the previous S3 object is deleted.

- Updating a **rejected** course (`isVerified: false` with a `verificationRejectionReason`) moves it back to pending review: `verificationRejectionReason` and `lastVerificationRejectedAt` are reset to `null`.
- Updating a **verified** or **pending** course does not change its verification state — a verified course stays live.
- `slug` is not regenerated when `title` changes.

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
| `thumbnailKey` | Optional, non-empty string (S3 object key from API 2). |
| `videoKey` | Optional, non-empty string (S3 object key from API 3). |
| `totalDurationInMinutes` | Required (number, ≥ 0) whenever `videoKey` is sent; omit otherwise. |
| `price` | Optional, number, ≥ 0. |
| `level` | Optional, one of `"beginner"`, `"intermediate"`, `"advanced"`. |
| `category` | Optional, non-empty string (Category `_id`). |

Same as [API 4](#api-4--create-course): `totalDurationInMinutes` must be read from the actual video file on the frontend (e.g. an `HTMLVideoElement`'s `.duration`), never typed in by the instructor — and only when a new `videoKey` is being sent, since it replaces the course's current value.

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
| 400 | `Invalid value "<value>" for field "_id"` | `id` is not a valid Mongo ObjectId. |
| 400 | `"<value>" already exists. Please use a different title` | The new `title` matches another of the instructor's courses. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an instructor. |
| 403 | `You do not have permission to access this course` | Caller is not the course's owning instructor. |
| 404 | `Course not found` | No course exists with that `id`. |

## API 6 — Delete course

`DELETE /api/v1/courses/:id`

Instructor only, and only the course's own instructor. Deletes the course document and both its S3 objects (thumbnail + video).

Before deletion, the service snapshots the complete course metadata into `courseDetails`, sets `isCourseDeleted: true`, and clears `course: null` on all existing transaction records referencing this course. This guarantees that historical transactions remain intact and readable without broken references or client crashes.

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
| 400 | `Cannot delete course because students are enrolled in it` | One or more students are currently enrolled in the course. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to access this course` | Caller is not the course's owning instructor. |
| 404 | `Course not found` | No course exists with that `id`. |

## API 7 — Create payment intent (Student)

`POST /api/v1/courses/:id/payment-intent`

Student only. Course must be verified, the student must not already be enrolled, and the course's instructor must have completed Stripe onboarding. Creates a Stripe `PaymentIntent` with the platform commission split off as an application fee, transferred to the instructor's connected Stripe account.

Calling this again for the same course while an earlier payment is still `pending`:

- **Price unchanged** → the existing `PaymentIntent` is reused and its `clientSecret` is returned again; no new transaction is created.
- **Price changed** → the old `PaymentIntent` is canceled on Stripe, its transaction is marked `failed`, and a new `PaymentIntent` + pending transaction are created at the current price.

Either way, always use the `clientSecret` from the latest response and discard any Stripe Elements instance tied to an earlier, different one.

On a student's first purchase, a Stripe Customer is created for them. The amount charged is `price` in USD; the platform commission (the backend's `PLATFORM_COMMISSION_PERCENTAGE` setting, 5% for this project) is taken as Stripe's `application_fee_amount`, and the rest is transferred to the instructor.

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

### What happens after the payment (Stripe webhooks)

This API only creates a `pending` transaction. **The student is not enrolled yet when this call returns, nor when `stripe.confirmPayment()` resolves.** Stripe then calls the backend's webhook (`POST /api/v1/stripe/webhook`, server-to-server — never called by the frontend):

- **`payment_intent.succeeded`** — the pending transaction becomes `paid`: `amountPaid`, `amountPaidAt`, `stripeChargeId` are set, and `adminCommission`/`instructorRevenue` are recomputed from the amounts Stripe actually charged. An enrollment is created (progress fields at `0`/`false`), which grants course access, and the course's `totalStudentsEnrolled` (+1), `totalRevenueInstructor` and `totalRevenueAdmin` are increased. If an enrollment for this student+course already exists (e.g. Stripe re-delivers the webhook), the event is skipped, so a purchase is never counted twice.
- **`payment_intent.payment_failed`** — a still-`pending` transaction becomes `failed` (a `paid`/`refunded` one is never downgraded). Nothing else changes. Calling this API again then creates a fresh PaymentIntent, since only `pending` ones are reused. If the student instead retries on the same `clientSecret` and that attempt succeeds, the `payment_intent.succeeded` event still marks the transaction `paid` and enrolls them.

Because enrollment happens asynchronously, after a successful `confirmPayment()` poll something that reflects it (e.g. `GET /api/v1/courses/:id`, which returns `404 You are not enrolled in this course` until the webhook has been processed, or `GET /api/v1/enrollments?course=<id>`) before sending the student to the course player.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not a student. |
| 404 | `Course not found` | Course doesn't exist, or exists but is not verified. |
| 400 | `Invalid value "<value>" for field "_id"` | `id` is not a valid Mongo ObjectId. |
| 400 | `You are already enrolled in this course` | Student already has an enrollment for this course. |
| 400 | `This course's instructor has not completed payment onboarding yet` | Instructor hasn't finished Stripe Connect onboarding. |
| 500 | `Something went wrong. Please try again later.` | A Stripe API call failed. |

## API 8 — Refund course (Student)

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
- **Database cleanup happens immediately**, inside this request, once Stripe accepts the refund: the transaction becomes `refunded`, the enrollment is deleted (course access ends), the course's `totalStudentsEnrolled` (−1), `totalRevenueInstructor` and `totalRevenueAdmin` are reduced by this purchase's amounts, and the student's review of the course (if any) is deleted and the course's `averageRating`/`totalReviews` recalculated.
- **Stripe `charge.refunded` webhook** — Stripe later notifies the backend's webhook. Since the transaction is already `refunded`, the event is skipped. It only does the cleanup above when the transaction is not yet `refunded` — i.e. for refunds issued directly from the Stripe Dashboard (any refund there, even a partial one, triggers the full cleanup).
- A duplicate/double-click refund request for the same course never reaches Stripe twice: the first request atomically claims the transaction (`paid` → `refund_processing`) before calling Stripe. A second request that races past the payment-state check gets `400 A refund for this course is already being processed`; one that arrives while the transaction is already `refund_processing` gets `400 This payment is not eligible for a refund`; and once the refund has completed, the enrollment is gone, so a later request gets `404 You are not enrolled in this course`.

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
| 400 | `Invalid value "<value>" for field "course"` | `id` is not a valid Mongo ObjectId. |
| 400 | `This course has already been refunded` | Transaction is not in a `paid` state (already refunded, or Stripe reports the charge as already refunded). |
| 400 | `This payment is not eligible for a refund` | Transaction is not in a `paid` state for another reason (e.g. `pending`, `failed`, or `refund_processing`). |
| 400 | `Refund window has expired. Refunds are only allowed within 7 days of purchase` | More than 7 days since `amountPaidAt`. |
| 400 | `You have watched more than 30% of the course and are no longer eligible for a refund` | `enrollment.watchPercentage` exceeds 30%. |
| 400 | `A refund for this course is already being processed` | Another refund request for the same transaction is already in flight (e.g. a duplicate/double-click call). |
| 500 | `Unable to process refund: no charge reference found` | `stripeChargeId` is missing on the transaction. |
| 500 | `Unable to process refund. Please try again later` | Stripe rejected the refund for a reason other than "already refunded". |

## API 9 — Get refund eligibility (Student)

`GET /api/v1/courses/:id/refund-eligibility`

Student only. Read-only check — runs the exact same rules as [API 8](#api-8--refund-course-student) (payment state, 7-day window, 30% watch limit) without claiming the transaction or calling Stripe. Use it to show/hide a "Request refund" button and explain why it's disabled, before the student actually submits a refund request.

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
| `daysSincePurchase` | Days elapsed since `amountPaidAt`, as a fractional number (e.g. `2.31`); `null` whenever `paymentStatus` is not `"paid"`. |
| `daysRemaining` | Whole days left in the 7-day refund window (rounded up, never below 0); `null` under the same condition as `daysSincePurchase`. |

`reason` is one of: `"This course has already been refunded"`, `"A refund for this course is already being processed"`, `"This payment is not eligible for a refund"`, `"Refund window has expired. Refunds are only allowed within 7 days of purchase"`, `"You have watched more than 30% of the course and are no longer eligible for a refund"`, or `null`.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Invalid value "<value>" for field "course"` | `id` is not a valid Mongo ObjectId. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not a student. |
| 404 | `You are not enrolled in this course` | No enrollment record for this student+course. |
| 404 | `No payment record found for this enrollment` | No transaction linked to the enrollment. |

## API 10 — Get course completion status (Student)

`GET /api/v1/courses/:id/completion-status`

Student only. Requires an existing enrollment. `completionPercentage` is the enrollment's `watchPercentage`; `completed` is its `watchedCompletely` flag.

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
| 400 | `Invalid value "<value>" for field "course"` | `id` is not a valid Mongo ObjectId. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not a student. |
| 404 | `You are not enrolled in this course` | No enrollment record for this student+course. |

## API 11 — Issue Course Certificate

Generate and issue a course completion certificate for the enrolled student. Can be called repeatedly by the student to view/regenerate their certificate data.

Side effects on the enrollment: `certificateIssued` is set to `true` and `certificateIssuedAt` is stamped on the first call (later calls keep the original date). If the student reached 95% without `watchedCompletely` being set, it is set now (with `watchedCompletelyAt`).

```http
GET /api/v1/courses/:id/issue-certificate
```

### Access

- **Allowed caller:** Student only.
- Requires `accessToken` cookie.
- Caller must be enrolled in the course and must have completed the course (`watchedCompletely: true` or `watchPercentage >= 95%`).

### URL params

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string (ObjectId) | Yes | MongoDB `_id` of the course. |

### Request body

None.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Certificate issued successfully",
  "data": {
    "certificateId": "CERT-66F1234567890ABCDEF12345",
    "enrollmentId": "66f1234567890abcdef12345",
    "title": "Certificate of Completion",
    "subtitle": "This is proudly presented to",
    "studentName": "John Doe",
    "studentEmail": "john.doe@example.com",
    "courseTitle": "Complete Web Development Bootcamp",
    "courseLevel": "beginner",
    "courseDurationInMinutes": 480,
    "instructorName": "Jane Doe",
    "categoryName": "Web Development",
    "watchPercentage": 100,
    "issuedAt": "2026-09-30T17:15:00.000Z",
    "completedAt": "2026-09-30T17:10:00.000Z",
    "platformName": "zAcademy",
    "issuer": "Z-Academy Online Learning Platform",
    "student": {
      "id": "66f111111111111111111111",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "avatarUrl": "https://s3.<region>.amazonaws.com/<bucket>/5.0/users/avatars/<uuid>-john.jpeg"
    },
    "course": {
      "id": "66f222222222222222222222",
      "title": "Complete Web Development Bootcamp",
      "slug": "complete-web-development-bootcamp-a1b2c3d4",
      "level": "beginner",
      "totalDurationInMinutes": 480,
      "categoryName": "Web Development",
      "thumbnailUrl": "https://s3.<region>.amazonaws.com/<bucket>/5.0/courses/thumbnails/<uuid>-bootcamp-thumbnail.jpeg"
    },
    "instructor": {
      "id": "66f333333333333333333333",
      "fullName": "Jane Doe",
      "bio": "Senior Full-Stack Engineer and Educator",
      "avatarUrl": null
    }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Invalid value "<value>" for field "course"` | `id` is not a valid Mongo ObjectId. |
| 400 | `You must complete the course before a certificate can be issued (current progress: <watchPercentage>%)` | Student has not completed at least 95% of the course video. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not a student. |
| 404 | `You are not enrolled in this course` | Student has no active enrollment in this course. |

## API 12 — List courses

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

`projection` is applied after the join, so it can also name `instructorDetails`/`categoryDetails`. `_id` is always included. `thumbnailUrl` is only present if `thumbnailKey` is projected, and **`videoKey` must be projected** — every item gets a signed `videoUrl`, and without `videoKey` the request fails with `500`.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Courses fetched successfully",
  "data": {
    "courses": [
      { /* Joined course shape (with videoUrl), see above */ }
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

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | An invalid or undocumented query param is sent. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 500 | `Something went wrong. Please try again later.` | `instructor` is not a valid ObjectId, or `projection` leaves out `videoKey`. |

## API 13 — List a student's courses (Admin or Instructor)

`GET /api/v1/courses/student/:id`

Admin or Instructor. Returns a paginated, sortable, searchable list of courses a specific student is enrolled in, identified by their user `_id`. Accepts the same query parameters as [API 12](#api-12--list-courses) and returns the same joined response shape.

Admins see all courses the student is enrolled in. Instructors see only the courses where both of these conditions are true:

- The requested student is enrolled in the course.
- The authenticated instructor owns the course.

An instructor cannot use this endpoint to view the student's courses belonging to another instructor.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string (Mongo `_id` of the student). |

### Query parameters

Identical to [API 12](#api-12--list-courses):

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
      { /* Joined course shape (with videoUrl), see above */ }
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

For an admin caller this includes **all** of the courses the student is enrolled in (for an instructor, only the instructor's own). `projection` behaves as in [API 12](#api-12--list-courses) (it must include `videoKey`).

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | An invalid or undocumented query param is sent, or `id` is missing. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an admin or instructor. |
| 500 | `Something went wrong. Please try again later.` | `id` or the `instructor` query param is not a valid ObjectId, or `projection` leaves out `videoKey`. |

---

## API 14 — List an instructor's courses (Admin or Student)

`GET /api/v1/courses/instructor/:id`

Admin or Student. Returns a paginated, sortable, searchable list of courses belonging to a specific instructor, identified by their user `_id`. Accepts the same query parameters as [API 12](#api-12--list-courses) and returns the same joined response shape.

### Role-based visibility

| Caller | Sees |
| --- | --- |
| Admin | All courses of the instructor — verified, rejected, and pending review. |
| Student | Only **verified** courses of the instructor (`isVerified: true`, `verificationRejectionReason: null`). |

A Student calling this endpoint sees the same courses that would appear on the instructor's public profile — useful for browsing before purchasing.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string (Mongo `_id` of the instructor). |

### Query parameters

Identical to [API 12](#api-12--list-courses):

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
      { /* Joined course shape (with videoUrl), see above */ }
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

For an admin caller this includes **all** of the instructor's courses — verified, rejected, and pending review. Use the `status` or `isVerified` query params to narrow to a specific subset. `projection` behaves as in [API 12](#api-12--list-courses) (it must include `videoKey`).

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | An invalid or undocumented query param is sent, or `id` is missing. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an admin or student. |
| 500 | `Something went wrong. Please try again later.` | `id` or the `instructor` query param is not a valid ObjectId, or `projection` leaves out `videoKey`. |

## API 15 — List featured courses

`GET /api/v1/courses/featured`

No authentication required — no `accessToken` cookie needed. Always scoped to verified courses only (`isVerified: true` and `verificationRejectionReason: null`). Returns up to 3 courses, highest-rated first (sorted by `averageRating`, then `totalReviews`, then newest). No pagination, no query params. Does **not** return `videoUrl`.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Featured courses fetched successfully",
  "data": {
    "courses": [
      { /* Public course shape (no videoUrl, revenue totals or review notes), see above */ }
    ]
  }
}
```

## API 16 — List trending courses

`GET /api/v1/courses/trending`

No authentication required — no `accessToken` cookie needed. Always scoped to verified courses only (`isVerified: true` and `verificationRejectionReason: null`). Returns up to 3 courses with the most enrollments (sorted by `totalStudentsEnrolled`, then newest). No pagination, no query params. Does **not** return `videoUrl`.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Trending courses fetched successfully",
  "data": {
    "courses": [
      { /* Public course shape (no videoUrl, revenue totals or review notes), see above */ }
    ]
  }
}
```

## API 17 — List public courses

`GET /api/v1/courses/public`

No authentication required — no `accessToken` cookie needed. Always scoped to verified courses only (`isVerified: true` and `verificationRejectionReason: null`). Does **not** return `videoUrl` (no signed URL is generated for anonymous traffic). Optionally filter by `category`, `level`, `instructor`, `price`, `rating`, and `duration`.

### Query parameters

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `search` | string | — | Case-insensitive search against `title`. |
| `category` | string | — | Filter by category `_id`. |
| `level` | `"beginner" \| "intermediate" \| "advanced"` | — | Filter by course difficulty level. |
| `instructor` | string | — | Filter by instructor `_id`. |
| `minPrice` | number (≥0) | — | Filter courses with price greater than or equal to this value. |
| `maxPrice` | number (≥0) | — | Filter courses with price less than or equal to this value. |
| `minRating` | number (0-5) | — | Filter courses with average rating greater than or equal to this value. |
| `minDuration` | number (≥0) | — | Filter courses with total duration (in minutes) greater than or equal to this value. |
| `maxDuration` | number (≥0) | — | Filter courses with total duration (in minutes) less than or equal to this value. |
| `sortBy` | string | `createdAt` | Field to sort the results by (e.g., `price`, `averageRating`). |
| `sortOrder` | `"asc" \| "desc"` | `desc` | Sort direction. |
| `page` | number (≥1) | `1` | |
| `limit` | number (≥1) | `10` | |

No other query params are accepted (`400 Validation failed` if sent).

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Courses fetched successfully",
  "data": {
    "courses": [
      { /* Public course shape (no videoUrl, revenue totals or review notes), see above */ }
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

Note the absence of `videoUrl` compared to the [API 12](#api-12--list-courses) shape.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | An invalid or undocumented query param is sent. |
| 500 | `Something went wrong. Please try again later.` | `category` or `instructor` is not a valid ObjectId. |

## API 18 — Get public course details

`GET /api/v1/courses/:id/public`

No authentication required. Always scoped to verified courses only (`isVerified: true` and `verificationRejectionReason: null`) — a rejected/pending course, or one that doesn't exist, returns `404`. Does **not** return `videoUrl`.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string (Mongo `_id`). |

### Success response

HTTP `200`

`course` uses the [joined course shape](#joined-course-shape), without `videoUrl`:

```json
{
  "status": "success",
  "message": "Course details fetched successfully",
  "data": {
    "course": { /* Public course shape (no videoUrl, revenue totals or review notes), see above */ }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 500 | `Something went wrong. Please try again later.` | `id` is not a valid Mongo ObjectId. |
| 404 | `Course not found` | No verified course exists with that `id` (also returned for a rejected/pending course). |

## API 19 — Get course details

`GET /api/v1/courses/:id`

Requires an authenticated session (unlike `GET /`, anonymous callers are rejected with `401`). What's returned depends on the caller's role.

### Role-based behavior (details endpoint)

Every role gets the same joined shape back — `instructorDetails`/`categoryDetails` instead of raw `instructor`/`category` (same as an [API 12](#api-12--list-courses) list item) — but who can reach it differs:

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

`course` uses the [joined course shape](#joined-course-shape) (with `videoUrl`), for every role:

```json
{
  "status": "success",
  "message": "Course details fetched successfully",
  "data": {
    "course": { /* Joined course shape (with videoUrl), see above */ }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Invalid value "<value>" for field "course"` | Caller is a student and `id` is not a valid Mongo ObjectId. |
| 500 | `Something went wrong. Please try again later.` | Caller is an admin/instructor and `id` is not a valid Mongo ObjectId. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to access this course` | Caller is an instructor and the course belongs to someone else. |
| 404 | `Course not found` | Caller is an admin/instructor and no course exists with that `id`. |
| 404 | `You are not enrolled in this course` | Caller is a student with no enrollment for this course (also returned when the `id` doesn't exist at all). |

## Frontend types

Copy [`src/response-types/courseResponseTypes.ts`](../../src/response-types/courseResponseTypes.ts) into the frontend project. It is a pure TypeScript file with no backend imports (it reuses `AuthUser`/`SuccessApiResponse`/`ApiErrorResponse` from [`authResponseTypes.ts`](../../src/response-types/authResponseTypes.ts) and `Pagination` from [`userResponseTypes.ts`](../../src/response-types/userResponseTypes.ts)) and exports `Course` (raw-id shape), `CourseListItem` (joined shape with `videoUrl`), `PublicCourseListItem` (public shape: no `videoUrl`, revenue totals or review notes), and one response type per API above: `UploadCourseThumbnailResponse`, `UploadCourseVideoResponse`, `CreateCourseResponse`, `UpdateCourseResponse`, `DeleteCourseResponse`, `UpdateCourseVerificationResponse`, `CreateCoursePaymentIntentResponse`, `RequestCourseRefundResponse`, `CourseRefundEligibility`, `GetCourseRefundEligibilityResponse`, `GetCourseCompletionStatusResponse`, `IssueCourseCertificateResponse`, `GetCoursesResponse`, `GetCourseDetailsResponse`, `GetPublicCoursesResponse`, `GetPublicCourseDetailsResponse`, `GetFeaturedCoursesResponse`, `GetTrendingCoursesResponse`, `GetInstructorCoursesResponse`, and `GetStudentCoursesResponse`.

