# Enrollment API Integration Guide

This guide is the frontend contract for the enrollment-management APIs currently implemented by the backend. All paths below are relative to the backend origin.

Base path: `/api/v1/enrollments`

## Integration rules

- Every route in this guide requires an authenticated session: send the `accessToken` cookie with credentials enabled (`fetch`: `credentials: "include"`; Axios: `withCredentials: true`).
- Success, validation, and application-error responses use `{ status, message, data }`, the same envelope as the auth APIs. See [`authApiIntegrationGuide.md`](./authApiIntegrationGuide.md) for the full envelope and status-code reference — it applies here unchanged.
- Strict validation is used: do not send fields that are not documented for that request. An undocumented query param causes `400 Validation failed`.
- Requests under `/api` are limited to 100 per IP per hour.
- Enrollments are created automatically by the backend (via the Stripe `payment_intent.succeeded` webhook) when a student completes a course payment — there is no create/update/delete endpoint here. This router is read-only.

## Roles and access

| Route | Allowed caller | Visibility |
| --- | --- | --- |
| `GET /` | Any authenticated user | Admin sees every enrollment; Instructor sees only enrollments in their own courses; Student sees only their own enrollments. |
| `GET /:id` | Any authenticated user | Admin can view any enrollment; Instructor/Student can only view an enrollment where they are the instructor/student on it (`403` otherwise). |

Unlike other routers, there is no `restrictTo(...)` role gate on these routes — every role is allowed to call them, and the actual scoping/ownership check happens inside the service layer.

A missing/invalid/expired `accessToken` cookie receives the same `401` errors documented for `/auth/me`.

## Enrollment shape

Every enrollment object returned by these APIs looks like:

```json
{
  "_id": "66e1a1b2c3d4e5f678901234",
  "studentDetails": {
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
  "transactionDetails": {
    "_id": "66f1a1b2c3d4e5f678901555",
    "transactionId": "pi_3PXXXXXXXXXXXXXX",
    "stripeChargeId": "ch_3PXXXXXXXXXXXXXX",
    "currency": "usd",
    "student": "66c0a1b2c3d4e5f678901111",
    "course": "66d1a1b2c3d4e5f678901234",
    "instructor": "66c0a1b2c3d4e5f678901222",
    "totalPrice": 49.99,
    "amountPaid": 49.99,
    "amountPaidAt": "2026-09-01T12:00:00.000Z",
    "paymentStatus": "paid",
    "adminCommissionPercentage": 5,
    "adminCommission": 2.5,
    "instructorRevenue": 47.49,
    "createdAt": "2026-09-01T12:00:00.000Z",
    "updatedAt": "2026-09-01T12:00:00.000Z"
  },
  "enrolledAt": "2026-09-01T12:00:00.000Z",
  "totalDurationWatchedInMinutes": 120,
  "watchPercentage": 25,
  "watchedCompletely": false,
  "watchedCompletelyAt": null,
  "mostRecentlySeen": true,
  "certificateIssued": false,
  "certificateIssuedAt": null,
  "createdAt": "2026-09-01T12:00:00.000Z",
  "updatedAt": "2026-09-05T09:00:00.000Z"
}
```

The raw `student`, `course`, `instructor`, and `transaction` id fields are never returned directly — they are always replaced by the joined `studentDetails`, `courseDetails`, `instructorDetails`, and `transactionDetails` objects. `studentDetails`/`instructorDetails` never include `password`, `otp`, `otpExpires`, `stripeAccountId`, `stripeOnboardingComplete`, `verificationRejectionReason`, or `lastVerificationRejectedAt`.

`courseDetails` does **not** include `thumbnailUrl` or `videoUrl` (those are only computed on the course endpoints themselves) — fetch `GET /api/v1/courses/:id` separately if you need to display the course's thumbnail or video.

## API 1 — List enrollments

`GET /api/v1/enrollments`

Returns a paginated, sortable, filterable list of enrollments, scoped by the caller's role (see Roles and access above).

### Query parameters

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `student` | string | — | Filter by student `_id`. |
| `course` | string | — | Filter by course `_id`. |
| `instructor` | string | — | Filter by instructor `_id`. |
| `transaction` | string | — | Filter by transaction `_id`. |
| `watchedCompletely` | `"true" \| "false"` | — | Filter by completion state. |
| `certificateIssued` | `"true" \| "false"` | — | Filter by certificate-issued state. |
| `projection` | string | — | Comma-separated Mongo field projection. |
| `page` | number (≥1) | `1` | |
| `limit` | number (≥1) | `10` | |
| `sortBy` | string | `createdAt` | |
| `sortOrder` | `"asc" \| "desc"` | `desc` | |

All params are optional and sent as query-string values (strings); `page`/`limit` are coerced to numbers server-side. There is no `search` param on this endpoint.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Enrollments fetched successfully",
  "data": {
    "enrollments": [ /* Enrollment shape, see above */ ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalDocuments": 3,
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
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |

## API 2 — Get enrollment details

`GET /api/v1/enrollments/:id`

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string (Mongo `_id`). |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Enrollment details fetched successfully",
  "data": {
    "enrollment": { /* Enrollment shape, see above */ }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to access this enrollment` | Caller is an Instructor/Student who is not a party to this enrollment. |
| 404 | `Enrollment not found` | No enrollment exists with that `id`. |

## Frontend types

Copy [`src/response-types/enrollmentResponseTypes.ts`](../src/response-types/enrollmentResponseTypes.ts) into the frontend project. It is a pure TypeScript file with no backend imports (it reuses `SuccessApiResponse`/`ApiErrorResponse` from [`authResponseTypes.ts`](../src/response-types/authResponseTypes.ts) and `Pagination` from [`userResponseTypes.ts`](../src/response-types/userResponseTypes.ts)) and exports `Enrollment`, `EnrollmentUserSummary`, `EnrollmentCourseSummary`, `EnrollmentTransactionSummary`, `GetEnrollmentsResponse`, and `GetEnrollmentDetailsResponse`.
