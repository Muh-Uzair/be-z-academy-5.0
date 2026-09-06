# Review API Integration Guide

This guide is the frontend contract for the review-management APIs currently implemented by the backend. All paths below are relative to the backend origin.

Base path: `/api/v1/reviews`

## Integration rules

- `GET /` and `GET /:id` are public — no `accessToken` cookie required. Every other route in this guide requires an authenticated session: send the `accessToken` cookie with credentials enabled (`fetch`: `credentials: "include"`; Axios: `withCredentials: true`).
- Success, validation, and application-error responses use `{ status, message, data }`, the same envelope as the auth APIs. See [`authApiIntegrationGuide.md`](./authApiIntegrationGuide.md) for the full envelope and status-code reference — it applies here unchanged.
- Strict validation is used: do not send fields that are not documented for that request. Body and query fields are validated separately; an undocumented field in either causes `400 Validation failed`.
- Requests under `/api` are limited to 100 per IP per hour.
- A student may leave exactly one review per course, and only for a course they are enrolled in.

## Roles and access

| Route | Allowed caller |
| --- | --- |
| `POST /` | Student only |
| `GET /` | Public (no auth required) |
| `GET /:id` | Public (no auth required) |
| `PATCH /:id` | Student only, and only the review's own author |
| `DELETE /:id` | Any authenticated user — the review's own author, or an Admin |

A caller with the wrong role receives `403 You do not have permission to perform this action`. A missing/invalid/expired `accessToken` cookie receives the same `401` errors documented for `/auth/me`.

## Review shapes

`GET /` and `GET /:id` join the review's references and return:

```json
{
  "_id": "66g1a1b2c3d4e5f678901234",
  "rating": 5,
  "feedback": "Excellent course, very well structured and easy to follow.",
  "reviewByDetails": {
    "_id": "66c0a1b2c3d4e5f678901111",
    "fullName": "John Doe",
    "email": "john@example.com",
    "avatar": null
  },
  "courseDetails": {
    "_id": "66d1a1b2c3d4e5f678901234",
    "title": "Complete Web Development Bootcamp",
    "description": "Learn frontend, backend, and full-stack web development from scratch.",
    "price": 49.99,
    "level": "beginner",
    "instructor": "66c0a1b2c3d4e5f678901222",
    "category": "66c0a1b2c3d4e5f678901333",
    "isVerified": true,
    "verificationRejectionReason": null,
    "lastVerificationRejectedAt": null,
    "averageRating": 4.5,
    "totalReviews": 12,
    "totalStudentsEnrolled": 340,
    "totalDurationInMinutes": 480,
    "totalRevenueInstructor": 15980,
    "totalRevenueAdmin": 840,
    "slug": "complete-web-development-bootcamp-a1b2c3d4",
    "createdAt": "2026-08-25T10:00:00.000Z",
    "updatedAt": "2026-08-25T10:00:00.000Z"
  },
  "instructorDetails": {
    "_id": "66c0a1b2c3d4e5f678901222",
    "fullName": "Jane Smith",
    "email": "jane@example.com",
    "avatar": null
  },
  "createdAt": "2026-09-01T12:00:00.000Z",
  "updatedAt": "2026-09-01T12:00:00.000Z"
}
```

The raw `reviewBy`, `course`, and `instructor` id fields are never returned by these two endpoints — they are always replaced by the joined `reviewByDetails`, `courseDetails`, and `instructorDetails` objects. `reviewByDetails`/`instructorDetails` never include `password`, `otp`, `otpExpires`, `stripeAccountId`, `stripeOnboardingComplete`, `verificationRejectionReason`, or `lastVerificationRejectedAt`. `courseDetails` does **not** include `thumbnailUrl`/`videoUrl` (only computed on the course endpoints) — fetch `GET /api/v1/courses/:id` separately if you need those.

`POST /` and `PATCH /:id` do **not** perform this join — they return the plain review document, with `reviewBy`/`course`/`instructor` as raw ids:

```json
{
  "_id": "66g1a1b2c3d4e5f678901234",
  "rating": 5,
  "feedback": "Excellent course, very well structured and easy to follow.",
  "reviewBy": "66c0a1b2c3d4e5f678901111",
  "course": "66d1a1b2c3d4e5f678901234",
  "instructor": "66c0a1b2c3d4e5f678901222",
  "createdAt": "2026-09-01T12:00:00.000Z",
  "updatedAt": "2026-09-01T12:00:00.000Z"
}
```

## API 1 — Create review

`POST /api/v1/reviews`

Student only. `instructor` is derived server-side from the course, not sent by the client.

### Request body

```json
{
  "course": "66d1a1b2c3d4e5f678901234",
  "rating": 5,
  "feedback": "Excellent course, very well structured and easy to follow."
}
```

| Field | Rules |
| --- | --- |
| `course` | Required, non-empty string (Course `_id`). |
| `rating` | Required, integer between 1 and 5. |
| `feedback` | Required, trimmed, 10–1000 characters. |

### Success response

HTTP `201`

```json
{
  "status": "success",
  "message": "Review created successfully",
  "data": {
    "review": { /* plain review document, see above */ }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | A field is missing, out of range, or an undocumented field is sent. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not a student. |
| 403 | `You must be enrolled in this course to review it` | Student is not enrolled in the course. |
| 400 | `You have already reviewed this course` | Student already left a review for this course. |
| 404 | `Course not found` | No course exists with that `id`. |

## API 2 — List reviews

`GET /api/v1/reviews`

Public. Returns a paginated, sortable, searchable, filterable list of reviews.

### Query parameters

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `course` | string | — | Filter by course `_id`. |
| `instructor` | string | — | Filter by instructor `_id`. |
| `reviewBy` | string | — | Filter by the reviewing student's `_id`. |
| `rating` | number (1–5) | — | Filter by exact rating. |
| `search` | string | — | Case-insensitive search against `feedback`. |
| `projection` | string | — | Comma-separated Mongo field projection. |
| `page` | number (≥1) | `1` | |
| `limit` | number (≥1) | `10` | |
| `sortBy` | string | `createdAt` | |
| `sortOrder` | `"asc" \| "desc"` | `desc` | |

All params are optional and sent as query-string values (strings); `page`/`limit`/`rating` are coerced to numbers server-side.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Reviews fetched successfully",
  "data": {
    "reviews": [ /* joined review shape, see above */ ],
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

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | An invalid or undocumented query param is sent. |

## API 3 — Get review details

`GET /api/v1/reviews/:id`

Public. Fetches a single review by id, with references joined.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string (Mongo `_id`). |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Review details fetched successfully",
  "data": {
    "review": { /* joined review shape, see above */ }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 404 | `Review not found` | No review exists with that `id`. |

## API 4 — Update review

`PATCH /api/v1/reviews/:id`

Student only, and only the review's own author. All fields are optional, but at least one must be sent.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string. |

### Request body

```json
{
  "rating": 4,
  "feedback": "Updated feedback after finishing the advanced modules."
}
```

| Field | Rules |
| --- | --- |
| `rating` | Optional, integer between 1 and 5. |
| `feedback` | Optional, trimmed, 10–1000 characters. |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Review updated successfully",
  "data": {
    "review": { /* plain review document, see above */ }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | Body is empty, a field fails its shape rules, or an undocumented field is sent. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not a student. |
| 403 | `You do not have permission to modify this review` | Caller is a student but not this review's author. |
| 404 | `Review not found` | No review exists with that `id`. |

## API 5 — Delete review

`DELETE /api/v1/reviews/:id`

Open to any authenticated role — the review's own author, or an Admin. There is no `restrictTo(...)` gate on this route; ownership/admin permission is enforced in the service layer.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string. |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Review deleted successfully",
  "data": null
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to delete this review` | Caller is neither the review's author nor an Admin. |
| 404 | `Review not found` | No review exists with that `id`. |

## Frontend types

Copy [`src/response-types/reviewResponseTypes.ts`](../src/response-types/reviewResponseTypes.ts) into the frontend project. It is a pure TypeScript file with no backend imports (it reuses `SuccessApiResponse`/`ApiErrorResponse` from [`authResponseTypes.ts`](../src/response-types/authResponseTypes.ts) and `Pagination` from [`userResponseTypes.ts`](../src/response-types/userResponseTypes.ts)) and exports `Review` (joined shape, for API 2/API 3), `ReviewDocument` (plain shape, for API 1/API 4), `ReviewUserSummary`, `ReviewCourseSummary`, `CreateReviewResponse`, `GetReviewsResponse`, `GetReviewDetailsResponse`, `UpdateReviewResponse`, and `DeleteReviewResponse`.
