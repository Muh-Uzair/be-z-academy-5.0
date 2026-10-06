# Dashboard API Integration Guide

This guide is the frontend contract for the dashboard APIs. All paths are relative to the backend origin.

Base path: `/api/v1/dashboard`

## Integration rules

- Every route requires an authenticated session: send the `accessToken` cookie with credentials enabled (`fetch`: `credentials: "include"`; Axios: `withCredentials: true`).
- Success, validation, and application-error responses use the standard `{ status, message, data }` envelope. See [`authApiIntegrationGuide.md`](./authApiIntegrationGuide.md) for the full envelope reference — it applies here unchanged.
- **`period` is required** on every dashboard route. Omitting it or sending an invalid value returns `400 Validation failed`.
- Strict validation is used: do not send any query param other than `period`.
- Requests under `/api` are rate-limited to 5000 per IP per hour.

## Period filter

| Value | Date range |
| --- | --- |
| `week` | Last 7 days |
| `month` | Last 30 days |
| `year` | Last 365 days |

All period-sensitive metrics are computed against this date window. The only exception is `recentUsers` on the admin dashboard — those are the 5 most recently joined users across all time and are not period-filtered.

## Roles and access

| Route | Allowed role | Returns `403` for |
| --- | --- | --- |
| `GET /admin` | `admin` | `instructor`, `student` |
| `GET /instructor` | `instructor` | `admin`, `student` |
| `GET /student` | `student` | `admin`, `instructor` |

A missing/invalid/expired `accessToken` cookie returns `401` (see auth guide).

---

## API 1 — Admin Dashboard

`GET /api/v1/dashboard/admin?period=week|month|year`

### Query parameters

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `period` | `"week" \| "month" \| "year"` | ✅ Yes | The time window for all metrics. |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Admin dashboard fetched successfully",
  "data": {
    "stats": {
      "totalRevenue": 1000,
      "adminCommission": 50,
      "totalStudents": 3,
      "totalInstructors": 2,
      "totalCourses": 5
    },
    "revenueTrend": {
      "Sunday": 0,
      "Monday": 100,
      "Tuesday": 50,
      "Wednesday": 200,
      "Thursday": 75,
      "Friday": 300,
      "Saturday": 275
    },
    "userGrowth": {
      "Sunday": 0,
      "Monday": 2,
      "Tuesday": 1,
      "Wednesday": 0,
      "Thursday": 3,
      "Friday": 1,
      "Saturday": 0
    },
    "topPerformingCourses": [
      {
        "courseId": "66d1a1b2c3d4e5f678901234",
        "title": "Complete Full-Stack Web Development Bootcamp",
        "instructorName": "Dr John Smith",
        "enrollmentsInPeriod": 12,
        "averageRating": 4.5,
        "adminCommissionEarned": 60
      }
    ],
    "recentUsers": [
      {
        "fullName": "Muhammad Ali",
        "email": "ali@example.com",
        "role": "student",
        "isVerified": true,
        "createdAt": "2026-10-04T10:00:00.000Z"
      }
    ]
  }
}
```

### `revenueTrend` and `userGrowth` shape by period

All keys are always present even if the value is `0`.

**`period=week`** — one key per day of the week:
```json
{
  "Sunday": 0,
  "Monday": 100,
  "Tuesday": 50,
  "Wednesday": 200,
  "Thursday": 75,
  "Friday": 300,
  "Saturday": 275
}
```

**`period=month`** — one key per week bucket (based on day-of-month):
```json
{
  "Week 1": 500,
  "Week 2": 300,
  "Week 3": 800,
  "Week 4": 200
}
```

**`period=year`** — one key per calendar month:
```json
{
  "January": 1000,
  "February": 500,
  "March": 800,
  "April": 600,
  "May": 900,
  "June": 400,
  "July": 700,
  "August": 300,
  "September": 1100,
  "October": 950,
  "November": 0,
  "December": 0
}
```

### `stats` field details

| Field | Source | Period-filtered? |
| --- | --- | --- |
| `totalRevenue` | Sum of `amountPaid` on `paid` transactions | ✅ Yes |
| `adminCommission` | Sum of `adminCommission` on `paid` transactions | ✅ Yes |
| `totalStudents` | Count of users with `role=student` registered in period | ✅ Yes |
| `totalInstructors` | Count of users with `role=instructor` registered in period | ✅ Yes |
| `totalCourses` | Count of verified courses created in period | ✅ Yes |

### `topPerformingCourses` details

- Returns **at most 5** courses. May return fewer if less than 5 courses have enrollments in the period.
- Ranked by `enrollmentsInPeriod` descending.
- `adminCommissionEarned` = sum of `adminCommission` on `paid` transactions for that course in the period.
- `averageRating` is the all-time rating from the Course document (not period-filtered).

### `recentUsers` details

- Always returns the **5 most recently joined users** across all roles.
- **Not period-filtered** — always all-time latest.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| `400` | `Validation failed` | `period` is missing, invalid, or an extra param is sent. |
| `401` | *(see auth guide)* | Access-token cookie missing/invalid/expired. |
| `403` | `You do not have permission to perform this action` | Non-admin role calling this endpoint. |

---

## API 2 — Instructor Dashboard

`GET /api/v1/dashboard/instructor?period=week|month|year`

> 🚧 Business logic coming soon.

### Query parameters

| Param | Type | Required |
| --- | --- | --- |
| `period` | `"week" \| "month" \| "year"` | ✅ Yes |

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| `400` | `Validation failed` | `period` is missing or invalid. |
| `401` | *(see auth guide)* | Access-token cookie missing/invalid/expired. |
| `403` | `You do not have permission to perform this action` | Non-instructor role calling this endpoint. |

---

## API 3 — Student Dashboard

`GET /api/v1/dashboard/student?period=week|month|year`

> 🚧 Business logic coming soon.

### Query parameters

| Param | Type | Required |
| --- | --- | --- |
| `period` | `"week" \| "month" \| "year"` | ✅ Yes |

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| `400` | `Validation failed` | `period` is missing or invalid. |
| `401` | *(see auth guide)* | Access-token cookie missing/invalid/expired. |
| `403` | `You do not have permission to perform this action` | Non-student role calling this endpoint. |

---

## Frontend types

Copy [`src/response-types/dashboardResponseTypes.ts`](../src/response-types/dashboardResponseTypes.ts) into the frontend project. It is a pure TypeScript file with no backend imports and exports:

| Export | Description |
| --- | --- |
| `DashboardPeriod` | `"week" \| "month" \| "year"` |
| `TrendRecord` | `Record<string, number>` — shape for `revenueTrend` and `userGrowth` |
| `AdminDashboardStats` | Stats card data |
| `TopPerformingCourse` | Single course in the top-5 list |
| `AdminRecentUser` | Single user in the recent-users list |
| `AdminDashboardData` | Full `data` payload of the admin dashboard response |
| `GetAdminDashboardResponse` | Complete typed response union (`SuccessApiResponse \| ApiErrorResponse`) |
