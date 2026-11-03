# Stats API Integration Guide

This guide details the `/api/v1/stats` endpoint, used to fetch global platform statistics. All paths below are relative to the backend origin.

Base path: `/api/v1/stats`

## Integration rules

- Responses use `{ status, message, data }`, the same envelope as the auth APIs. See [`authApiIntegrationGuide.md`](./authApiIntegrationGuide.md) for the full envelope and status-code reference.
- No query params or body are read by this endpoint.
- Requests under `/api` are limited to 5000 per IP per hour.

## Roles and access

| Route | Allowed caller |
| --- | --- |
| `GET /` | No authentication required |

## API 1 — Get platform stats

`GET /api/v1/stats`

No authentication required. Returns the total count of active students (distinct students with at least 1 current enrollment — refunded purchases no longer count, since a refund deletes the enrollment) and the total count of verified courses (`isVerified: true` and `verificationRejectionReason: null`).

Note that `data` holds the two counts directly (not nested under a named key).

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Platform stats fetched successfully",
  "data": {
    "totalStudents": 1542,
    "totalCourses": 120
  }
}
```

### Possible errors

(None specific to this route, standard 500 on server error)

## Frontend types

Copy [`src/response-types/statResponseTypes.ts`](../../src/response-types/statResponseTypes.ts) into the frontend project. It reuses `SuccessApiResponse`/`ApiErrorResponse` from [`authResponseTypes.ts`](../../src/response-types/authResponseTypes.ts) and exports `GetPlatformStatsResponseData` and `GetPlatformStatsResponse`.
