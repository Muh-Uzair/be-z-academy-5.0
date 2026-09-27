# Dashboard API Integration Guide

This guide is the frontend contract for the dashboard APIs.

Base path: `/api/v1/dashboard`

## Integration rules

- Every route requires an authenticated session: send the `accessToken` cookie with credentials enabled (`fetch`: `credentials: "include"`; Axios: `withCredentials: true`).
- Success, validation, and application-error responses use `{ status, message, data }`.
- Strict validation is used: do not send fields that are not documented for that request.

## Roles and access

| Route          | Allowed caller |
| -------------- | -------------- |
| `GET /admin`   | Admin only     |

---

## API 1 — Get admin dashboard

`GET /api/v1/dashboard/admin`

Admin only. Returns all data required to render the admin dashboard in a single request:
- **Summary cards** — five metrics (revenue, commission, students, instructors, courses), each with a current value, previous-period value, and a % change relative to the preceding period of the same length.
- **Revenue trend chart** — time-bucketed `totalRevenue` and `adminCommission` over the selected period.
- **User growth chart** — time-bucketed new students and new instructors over the selected period.
- **Top 5 performing courses** — sorted by total students enrolled.
- **Recent 10 users** — most recently joined, any role.

### Query parameters

| Param    | Type                             | Default   | Notes                                                       |
| -------- | -------------------------------- | --------- | ----------------------------------------------------------- |
| `period` | `"week" \| "month" \| "year"`   | `"month"` | Controls the time window for summary cards and chart data.  |

#### Period semantics

| `period` | Summary window    | Chart buckets         | Bucket label format | # of buckets |
| -------- | ----------------- | --------------------- | ------------------- | ------------ |
| `week`   | Last 7 days       | One per day           | `"YYYY-MM-DD"`      | 7            |
| `month`  | Last 30 days      | One per ISO week      | `"YYYY-WW"`         | 5            |
| `year`   | Last 12 months    | One per calendar month| `"YYYY-MM"`         | 12           |

**Summary comparison**: Each card shows `current` (selected window) vs `previous` (the preceding window of the same length). `changePercent` is `null` when `previous === 0`.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Admin dashboard data fetched successfully",
  "data": {
    "period": "month",
    "summary": {
      "totalRevenue": {
        "current": 5423000,
        "previous": 4838000,
        "changePercent": 12.1
      },
      "totalCommission": {
        "current": 271150,
        "previous": 241900,
        "changePercent": 12.1
      },
      "totalStudents": {
        "current": 340,
        "previous": 325,
        "changePercent": 4.6
      },
      "totalInstructors": {
        "current": 12,
        "previous": 12,
        "changePercent": 0
      },
      "totalCourses": {
        "current": 5,
        "previous": 4,
        "changePercent": 25.0
      }
    },
    "revenueTrend": [
      { "label": "2026-35", "totalRevenue": 820000, "adminCommission": 41000 },
      { "label": "2026-36", "totalRevenue": 1100000, "adminCommission": 55000 },
      { "label": "2026-37", "totalRevenue": 970000, "adminCommission": 48500 },
      { "label": "2026-38", "totalRevenue": 1340000, "adminCommission": 67000 },
      { "label": "2026-39", "totalRevenue": 1193000, "adminCommission": 59650 }
    ],
    "userGrowth": [
      { "label": "2026-35", "newStudents": 42, "newInstructors": 1 },
      { "label": "2026-36", "newStudents": 78, "newInstructors": 3 },
      { "label": "2026-37", "newStudents": 61, "newInstructors": 2 },
      { "label": "2026-38", "newStudents": 95, "newInstructors": 4 },
      { "label": "2026-39", "newStudents": 64, "newInstructors": 2 }
    ],
    "topCourses": [
      {
        "_id": "66d1a1b2c3d4e5f678901234",
        "title": "Complete Web Development Bootcamp",
        "instructorName": "Dr. Angela",
        "totalStudentsEnrolled": 4500,
        "averageRating": 4.8,
        "totalRevenueAdmin": 4500000
      }
    ],
    "recentUsers": [
      {
        "_id": "66c0a1b2c3d4e5f678901111",
        "fullName": "Alice Johnson",
        "email": "alice@example.com",
        "role": "student",
        "isVerified": false,
        "createdAt": "2026-09-27T10:00:00.000Z"
      }
    ]
  }
}
```

### Field notes

#### `summary` cards

All **revenue/commission** values are in **USD cents** (e.g. `5423000` = $54,230.00). Divide by 100 to display as dollars.

#### `revenueTrend` / `userGrowth`

- Arrays are always ordered **oldest → newest**.
- Every bucket in the selected period is always present, even if the value is `0` (no gaps).

#### `topCourses`

- Up to 5 courses, sorted by `totalStudentsEnrolled` descending.
- `totalRevenueAdmin` is cumulative (all-time), not scoped to the selected period.

#### `recentUsers`

- Up to 10 users, any role, sorted by `createdAt` descending.
- Not scoped to the selected period — always the 10 most recently joined.

### Possible errors

| HTTP status | Message                                             | When                                            |
| ----------- | --------------------------------------------------- | ----------------------------------------------- |
| 400         | `Validation failed`                                 | `period` is not one of `week`, `month`, `year`. |
| 401         | _(see auth guide `/me` 401 rows)_                   | Access-token cookie missing/invalid/expired.    |
| 403         | `You do not have permission to perform this action` | Caller is not an admin.                         |

---

## Frontend types

Copy [`src/response-types/dashboardResponseTypes.ts`](../src/response-types/dashboardResponseTypes.ts) into the frontend project. It is a pure TypeScript file with no backend imports (it reuses `SuccessApiResponse` and `ApiErrorResponse` from [`authResponseTypes.ts`](../src/response-types/authResponseTypes.ts)) and exports `GetAdminDashboardResponse`, `AdminDashboardData`, `SummaryCard`, `RevenueChartPoint`, `UserGrowthPoint`, `TopCourse`, and `RecentUser`.
