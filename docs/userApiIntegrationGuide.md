# User API Integration Guide

This guide is the frontend contract for the user-management APIs currently implemented by the backend. All paths below are relative to the backend origin.

Base path: `/api/v1/users`

## Integration rules

- Every route in this guide requires an authenticated session: send the `accessToken` cookie with credentials enabled (`fetch`: `credentials: "include"`; Axios: `withCredentials: true`).
- Success, validation, and application-error responses use `{ status, message, data }`, the same envelope as the auth APIs. See [`authApiIntegrationGuide.md`](./authApiIntegrationGuide.md) for the full envelope and status-code reference — it applies here unchanged.
- Strict validation is used: do not send fields that are not documented for that request. Query params and body fields are validated separately; an undocumented field in either causes `400 Validation failed`.
- JSON request bodies are limited to 10 KB.
- Requests under `/api` are limited to 100 per IP per hour.

## Roles and access

| Route | Allowed caller |
| --- | --- |
| `GET /instructors` | Admin only |
| `GET /user/:id` | Admin only |
| `PATCH /user/:id/verification` | Admin only |
| `GET /get-instructor-onboarding-link` | Instructor only |
| `PATCH /update-profile` | Any authenticated user (student, instructor, or admin) |

A caller with the wrong role receives `403 You do not have permission to perform this action`. A missing/invalid/expired `accessToken` cookie receives the same `401` errors documented for `/auth/me`.

## API 1 — List instructors

`GET /api/v1/users/instructors`

Admin only. Returns a paginated, filterable, searchable list of instructor accounts.

### Query parameters

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `isVerified` | `"true" \| "false"` | — | Filter by verification status. Omit to return both. |
| `search` | string | — | Case-insensitive search across `fullName` and `email`. |
| `projection` | string | — | Comma-separated Mongo field projection (e.g. `fullName,email`). |
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
  "message": "Instructors fetched successfully",
  "data": {
    "instructors": [
      {
        "_id": "66d1a1b2c3d4e5f678901234",
        "fullName": "Jane Smith",
        "email": "jane@example.com",
        "role": "instructor",
        "isVerified": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalDocuments": 42,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

By default (no `projection` sent), each instructor object contains only the same public fields as `AuthUser`/`GetUserDetailsResponse` (`_id`, `fullName`, `email`, `role`, `avatar`, `bio`, `highestEducation`, `yearsOfExperience`, `isVerified`, `createdAt`, `updatedAt`) — sensitive/internal fields (`password`, `otp`, `otpExpires`, `stripeAccountId`, etc.) are never included. Sending `projection` narrows the result to a subset of those same public fields; it cannot be used to request excluded fields.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | An invalid or undocumented query param is sent. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an admin. |

## API 2 — Get user details

`GET /api/v1/users/user/:id`

Admin only. Fetches a single user's public fields, scoped to an expected role.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string (Mongo `_id`). |

### Query parameters

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `role` | `"student" \| "instructor" \| "admin"` | `instructor` | The role the user at `id` is expected to have. |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Instructor details fetched successfully",
  "data": {
    "user": {
      "_id": "66d1a1b2c3d4e5f678901234",
      "fullName": "Jane Smith",
      "email": "jane@example.com",
      "role": "instructor",
      "avatar": null,
      "bio": "Backend engineering instructor",
      "highestEducation": "Master's degree",
      "yearsOfExperience": 6,
      "isVerified": true,
      "createdAt": "2026-08-25T10:00:00.000Z",
      "updatedAt": "2026-08-25T10:00:00.000Z"
    }
  }
}
```

`message` reflects the requested `role`, capitalized (e.g. `Student details fetched successfully`).

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | `id` is missing or `role` is not one of the allowed values. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an admin. |
| 404 | `<role> not found` | No user exists with that `id` and `role` combination. |

## API 3 — Approve or reject a user's verification

`PATCH /api/v1/users/user/:id/verification`

Admin only. Verifies or rejects a student or instructor account, and emails the user the outcome.

### URL params

| Param | Rules |
| --- | --- |
| `id` | Required, non-empty string. |

### Query parameters

| Param | Type | Default |
| --- | --- | --- |
| `role` | `"student" \| "instructor" \| "admin"` | `instructor` |

### Request body

```json
{
  "isVerified": true
}
```

```json
{
  "isVerified": false,
  "verificationRejectionReason": "Submitted credentials could not be verified"
}
```

| Field | Rules |
| --- | --- |
| `isVerified` | Required boolean. |
| `verificationRejectionReason` | Required (non-empty, ≤500 chars) when `isVerified` is `false`. Omit or send `null` when `isVerified` is `true`. |

### Processing

1. Looks up the user by `id` and `role`.
2. Rejects the call if the user is already in the requested verification state.
3. Updates `isVerified`; when rejecting, also stamps `lastVerificationRejectedAt`.
4. Emails the user the approval/rejection outcome (rejection includes the reason).

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Instructor approved successfully",
  "data": {
    "user": {
      "_id": "66d1a1b2c3d4e5f678901234",
      "fullName": "Jane Smith",
      "email": "jane@example.com",
      "role": "instructor",
      "isVerified": true
    }
  }
}
```

`message` is `"<Role> approved successfully"` or `"<Role> rejected successfully"` depending on `isVerified`.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | Body is invalid, `role` param is invalid, or `verificationRejectionReason` is missing while rejecting. |
| 400 | `<role> is already verified` | `isVerified: true` sent for an already-verified user. |
| 400 | `<role> is already unverified` | `isVerified: false` sent for an already-unverified user. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an admin. |
| 404 | `<role> not found` | No user exists with that `id` and `role` combination. |
| 500 | `Something went wrong. Please try again later.` | Unexpected server or email-delivery error. |

## API 4 — Get instructor Stripe onboarding link

`GET /api/v1/users/get-instructor-onboarding-link`

Instructor only. No request body. Returns a fresh Stripe Express onboarding URL for the signed-in instructor, creating their connected Stripe account on first call.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Stripe onboarding link generated successfully",
  "data": {
    "url": "https://connect.stripe.com/setup/e/acct_.../onboarding"
  }
}
```

Redirect the instructor's browser to `data.url` to complete Stripe onboarding. The link is single-use/short-lived per Stripe's rules — request a new one each time rather than caching it.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `You do not have permission to perform this action` | Caller is not an instructor. |
| 404 | `Instructor not found` | The signed-in instructor's account no longer exists. |
| 500 | `Something went wrong. Please try again later.` | Unexpected server or Stripe API error. |

## API 5 — Update own profile

`PATCH /api/v1/users/update-profile`

Available to any authenticated user (student, instructor, or admin). Updates the signed-in user's own profile. All fields are optional, but at least one must be sent, and each role may only update its own allowed subset.

### Editable fields per role

| Field | Student | Instructor | Admin |
| --- | --- | --- | --- |
| `fullName` | ✅ | ✅ | ✅ |
| `avatar` | ✅ | ✅ | ✅ |
| `bio` | ✅ | ✅ | ❌ |
| `highestEducation` | ✅ | ✅ | ❌ |
| `yearsOfExperience` | ❌ | ✅ | ❌ |

Sending a field your role isn't allowed to change returns a `403`, not a validation error — validation passes because the field is shape-valid, but the service layer rejects it based on the caller's role.

### Request body

```json
{
  "fullName": "Jane A. Smith",
  "bio": "Senior backend engineering instructor",
  "highestEducation": "PhD",
  "yearsOfExperience": 7,
  "avatar": "https://cdn.example.com/avatars/jane.png"
}
```

| Field | Rules |
| --- | --- |
| `fullName` | String, trimmed, 2–100 characters. |
| `avatar` | Non-empty string, or `null` to clear it. |
| `bio` | Non-empty string, trimmed, max 500 characters. |
| `highestEducation` | Non-empty string, trimmed, max 150 characters. |
| `yearsOfExperience` | Number, 0–60. |

Send only the fields you intend to change; omitted fields are left as-is. An empty body (`{}`) is rejected by validation.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "66d1a1b2c3d4e5f678901234",
      "fullName": "Jane A. Smith",
      "email": "jane@example.com",
      "role": "instructor",
      "avatar": "https://cdn.example.com/avatars/jane.png",
      "bio": "Senior backend engineering instructor",
      "highestEducation": "PhD",
      "yearsOfExperience": 7,
      "isVerified": true,
      "createdAt": "2026-08-25T10:00:00.000Z",
      "updatedAt": "2026-08-31T09:00:00.000Z"
    }
  }
}
```

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| 400 | `Validation failed` | Body is empty, a field fails its shape rules, or an undocumented field is sent. |
| 401 | *(see auth guide `/me` 401 rows)* | Access-token cookie missing/invalid/expired. |
| 403 | `<role>s are not allowed to update: <fields>` | One or more sent fields are outside the caller's role's editable set. Lists every disallowed field, comma-separated. |
| 404 | `User not found` | The signed-in user's account no longer exists. |

## Frontend types

Copy [`src/response-types/userResponseTypes.ts`](../src/response-types/userResponseTypes.ts) into the frontend project. It is a pure TypeScript file with no backend imports (it reuses `AuthUser`, `SuccessApiResponse`, and `ApiErrorResponse` from [`authResponseTypes.ts`](../src/response-types/authResponseTypes.ts)) and exports `GetInstructorsResponse`, `GetUserDetailsResponse`, `UpdateUserVerificationResponse`, `GetInstructorOnboardingLinkResponse`, `UpdateProfileResponse`, and the shared `UserDetails`/`Pagination` types.
