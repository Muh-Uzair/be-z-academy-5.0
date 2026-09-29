# Dashboard API Integration Guide

This guide is the frontend contract for the dashboard APIs.

Base path: `/api/v1/dashboard`

## Integration rules

- Every dashboard route requires the `period` query param (`week`, `month` or `year`), e.g. `GET /api/v1/dashboard/admin?period=month`. Calling a route without it returns `400`. Use `month` as the frontend's default.
- Every route requires an authenticated session: send the `accessToken` cookie with credentials enabled (`fetch`: `credentials: "include"`; Axios: `withCredentials: true`).
- Success, validation, and application-error responses use `{ status, message, data }`.
- Strict validation is used: do not send fields that are not documented for that request.

## Roles and access

| Route             | Allowed caller |
| ----------------- | -------------- |
| `GET /admin`      | Admin only     |
| `GET /instructor` | Instructor only |
| `GET /student`    | Student only   |

---

## API 1 — Get admin dashboard

`GET /api/v1/dashboard/admin`

Admin only. Returns all data required to render the admin dashboard in a single request:
- **Summary cards** — five metrics (revenue, commission, students, instructors, courses), each with a current value, previous-period value, and a % change relative to the preceding period of the same length.
- **Revenue trend chart** — time-bucketed `totalRevenue` and `adminCommission` over the selected period.
- **User growth chart** — time-bucketed new students and new instructors over the selected period.
- **Top 5 performing courses** — sorted by total students enrolled.
- **Recent 5 users** — most recently joined, any role.

### Query parameters

| Param    | Type                             | Required  | Notes                                                       |
| -------- | -------------------------------- | --------- | ----------------------------------------------------------- |
| `period` | `"week" \| "month" \| "year"`   | **Yes**   | Controls the time window for summary cards and chart data. The backend has no default: omitting it returns `400`. The frontend should send `month` by default. |

#### Period semantics

| `period` | Summary window    | Chart buckets         | Bucket label format | # of buckets |
| -------- | ----------------- | --------------------- | ------------------- | ------------ |
| `week`   | Last 7 days       | One per day           | `"YYYY-MM-DD"`      | 7            |
| `month`  | Last 30 days      | One per ISO week      | `"YYYY-WW"`         | 5 or 6       |
| `year`   | Last 12 months    | One per calendar month| `"YYYY-MM"`         | 12           |

All windows and bucket labels are calculated in **UTC**. The `month` window is 30 days, which can touch 5 or 6 ISO weeks (`YYYY` is the ISO week-year), so do not hard-code the bucket count — render whatever labels the API returns. The first and last weekly buckets can cover only part of a week.

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
 
- Up to 5 users, any role, sorted by `createdAt` descending.
- Not scoped to the selected period — always the 5 most recently joined.

### Possible errors

| HTTP status | Message                                             | When                                            |
| ----------- | --------------------------------------------------- | ----------------------------------------------- |
| 400         | `Validation failed`                                 | `period` is missing or not one of `week`, `month`, `year`. |
| 401         | _(see auth guide `/me` 401 rows)_                   | Access-token cookie missing/invalid/expired.    |
| 403         | `You do not have permission to perform this action` | Caller is not an admin.                         |

---

## API 2 — Get instructor dashboard

`GET /api/v1/dashboard/instructor`

Instructor only. Returns all data required to render the instructor dashboard in a single request:
- **Summary cards** — Total Revenue (instructor share), Admin Commission, Total Students, Total Courses (live/pending), Average Rating.
- **Revenue by course (donut chart)** — up to 8 slices, each showing the instructor's revenue for one course in the selected period.
- **Enrollment trend (line chart)** — new enrollments per time bucket over the selected period.
- **Course performance table** — top 5 instructor courses with enrollments, avg completion %, and revenue.
- **Recent 5 reviews** — across all instructor's courses.

### Query parameters

| Param    | Type                            | Required  | Notes                                                      |
| -------- | ------------------------------- | --------- | ---------------------------------------------------------- |
| `period` | `"week" \| "month" \| "year"` | **Yes**   | Controls the time window for summary cards and chart data. No backend default; send `month` by default from the frontend. |

Same period semantics as API 1 (see table above).

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Instructor dashboard data fetched successfully",
  "data": {
    "period": "month",
    "summary": {
      "totalRevenue": { "current": 1450000, "previous": 1200000, "changePercent": 20.8 },
      "totalAdminCommission": { "current": 72500, "previous": 60000, "changePercent": 20.8 },
      "totalStudents": { "current": 120, "previous": 95, "changePercent": 26.3 },
      "totalCourses": { "live": 10, "pending": 2 },
      "averageRating": 4.7
    },
    "revenueByCourseTrend": [
      { "courseId": "66d1...", "courseTitle": "Mastering React 18", "instructorRevenue": 950000 },
      { "courseId": "66d2...", "courseTitle": "Advanced Node.js Patterns", "instructorRevenue": 500000 }
    ],
    "enrollmentTrend": [
      { "label": "2026-35", "newEnrollments": 28 },
      { "label": "2026-36", "newEnrollments": 45 },
      { "label": "2026-37", "newEnrollments": 31 },
      { "label": "2026-38", "newEnrollments": 16 },
      { "label": "2026-39", "newEnrollments": 0 }
    ],
    "coursePerformance": [
      {
        "_id": "66d1a1b2c3d4e5f678901234",
        "title": "Mastering React 18",
        "isVerified": true,
        "totalStudentsEnrolled": 1200,
        "averageRating": 4.8,
        "avgCompletionPercent": 65.0,
        "totalRevenueInstructor": 1200000
      },
      {
        "_id": "66d2a1b2c3d4e5f678901235",
        "title": "GraphQL for Beginners",
        "isVerified": false,
        "totalStudentsEnrolled": 0,
        "averageRating": 0,
        "avgCompletionPercent": 0,
        "totalRevenueInstructor": 0
      }
    ],
    "recentReviews": [
      {
        "_id": "66e1a1b2c3d4e5f678901999",
        "rating": 5,
        "feedback": "Amazing course! Very detailed and practical.",
        "courseTitle": "Mastering React 18",
        "studentName": "Alice J.",
        "createdAt": "2026-09-25T08:00:00.000Z"
      }
    ]
  }
}
```

### Field notes

#### `summary.totalRevenue` / `totalAdminCommission`

All revenue values are **instructor's share** (not total transaction amount). In **USD cents**.

#### `summary.totalStudents`

Counts **distinct** students who enrolled in any of the instructor's courses during the period (a student enrolled in 2 courses counts as 1).

#### `summary.totalCourses`

- `live`: Verified and published courses (`isVerified: true`, no rejection reason).
- `pending`: Submitted for review but not yet verified/rejected (`isVerified: false`, no rejection reason).

#### `revenueByCourseTrend`

Up to 8 courses sorted by `instructorRevenue` descending, scoped to the selected period. Zero-revenue courses are excluded (not shown in the donut).

#### `enrollmentTrend`

Every bucket in the selected period is always present, even if value is `0`.

#### `coursePerformance`

- Up to 5 instructor courses (verified + pending), sorted by `totalStudentsEnrolled` descending.
- `avgCompletionPercent` is the average `watchPercentage` (already 0–100) across all enrollments for the course, rounded to 1 decimal. `0` for courses with no enrollments.
- `totalRevenueInstructor` is cumulative all-time, not scoped to the selected period.

#### `recentReviews`

5 most recent reviews across all instructor's courses, not scoped to the selected period.

### Possible errors

| HTTP status | Message                                             | When                                            |
| ----------- | --------------------------------------------------- | ----------------------------------------------- |
| 400         | `Validation failed`                                 | `period` is missing or not one of `week`, `month`, `year`. |
| 401         | _(see auth guide `/me` 401 rows)_                   | Access-token cookie missing/invalid/expired.    |
| 403         | `You do not have permission to perform this action` | Caller is not an instructor.                    |

---

## API 3 — Get student dashboard

`GET /api/v1/dashboard/student`

Student only. Returns all data required to render the student dashboard in a single request:
- **Summary cards** — Total Enrolled Courses, Completed Courses, Active Courses, Overall Progress (average %), and Total Watch Time. Filtered by selected period.
- **Continue Watching** — Up to 3 most recently updated, incomplete courses with their thumbnails, instructors, and progress %. Not filtered by period (always active in-progress courses).
- **Recent Activity** — Up to 5 most recent events derived from enrollments, course completions, and certificate issuances. Filtered by selected period.

### Query parameters

| Param    | Type                                      | Required  | Notes                                                              |
| -------- | ----------------------------------------- | --------- | ------------------------------------------------------------------ |
| `period` | `"week" \| "month" \| "year"`             | **Yes**   | Controls the date window for summary cards and recent activity, using the same windows as API 1. No backend default; send `month` by default from the frontend. **Does not affect `continueWatching`.** |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Student dashboard data fetched successfully",
  "data": {
    "period": "month",
    "summary": {
      "totalEnrolledCourses": 8,
      "completedCourses": 5,
      "activeCourses": 3,
      "overallProgressPercent": 65.0,
      "totalWatchTimeInMinutes": 7440
    },
    "continueWatching": [
      {
        "enrollmentId": "66d1a1...",
        "courseId": "66c1b2...",
        "courseTitle": "Advanced System Design Patterns",
        "courseSlug": "advanced-system-design",
        "courseLevel": "advanced",
        "courseThumbnailUrl": "https://s3.amazonaws.com/...",
        "instructorName": "Alex Chen",
        "totalDurationInMinutes": 800,
        "totalDurationWatchedInMinutes": 450,
        "watchPercentage": 56.25
      }
    ],
    "recentActivity": [
      {
        "type": "completed",
        "courseTitle": "Advanced System Design Patterns",
        "courseId": "66c1b2...",
        "occurredAt": "2026-09-27T21:30:00.000Z"
      },
      {
        "type": "enrolled",
        "courseTitle": "UI/UX Design Masterclass",
        "courseId": "66c1b3...",
        "occurredAt": "2026-09-26T10:15:00.000Z"
      },
      {
        "type": "certificate_earned",
        "courseTitle": "JavaScript Fundamentals",
        "courseId": "66c1b4...",
        "occurredAt": "2026-09-24T14:20:00.000Z"
      }
    ]
  }
}
```

### Field notes

#### `summary`
- Scoped to the selected `period`.
- `activeCourses` are those where `watchedCompletely` is `false`.
- `overallProgressPercent` is the average `watchPercentage` across all **active** (non-completed) enrollments, rounded to 1 decimal (100% if all enrolled courses are completed).
- `totalWatchTimeInMinutes` is the sum of `totalDurationWatchedInMinutes` across enrollments in the period.

#### `continueWatching`

- Contains up to 3 courses where the student has started watching (`watchPercentage > 0`) and hasn't completed them (`watchedCompletely: false`).
- Sorted by `mostRecentlySeen` descending, then `updatedAt` descending.
- **Not affected by the `period` filter** (always displays current in-progress courses).
- `watchPercentage` is a percentage (`0` to `100`).
- `courseThumbnailUrl` will be a public S3 URL, or `null` if no thumbnail exists.

#### `recentActivity`
- Merges three types of events into a single timeline, sorted by `occurredAt` descending, taking the top 5:
  - `"enrolled"`: Sourced from `EnrollmentModel.createdAt`
  - `"completed"`: Sourced from `EnrollmentModel.watchedCompletelyAt`
  - `"certificate_earned"`: Sourced from `EnrollmentModel.certificateIssuedAt`

### Possible errors

| HTTP status | Message                                             | When                                            |
| ----------- | --------------------------------------------------- | ----------------------------------------------- |
| 400         | `Validation failed`                                 | `period` is missing or not one of `week`, `month`, `year`. |
| 401         | _(see auth guide `/me` 401 rows)_                   | Access-token cookie missing/invalid/expired.    |
| 403         | `You do not have permission to perform this action` | Caller is not a student.                        |

---

## Frontend types

Copy [`src/response-types/dashboardResponseTypes.ts`](../src/response-types/dashboardResponseTypes.ts) into the frontend project. It exports `GetAdminDashboardResponse`, `AdminDashboardData`, `SummaryCard`, `RevenueChartPoint`, `UserGrowthPoint`, `TopCourse`, `RecentUser`, `GetInstructorDashboardResponse`, `InstructorDashboardData`, `InstructorSummaryCard`, `CourseRevenueSlice`, `EnrollmentTrendPoint`, `InstructorCoursePerformance`, `InstructorRecentReview`, `GetStudentDashboardResponse`, `StudentDashboardData`, `StudentSummaryCards`, `ContinueWatchingItem`, `StudentActivityEvent`, and `ActivityEventType`.
