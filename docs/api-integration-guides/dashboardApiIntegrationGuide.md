# Dashboard API Integration Guide

This guide is the frontend contract for the dashboard APIs. All paths are relative to the backend origin.

Base path: `/api/v1/dashboard`

## Integration rules

- Every route requires an authenticated session: send the `accessToken` cookie with credentials enabled (`fetch`: `credentials: "include"`; Axios: `withCredentials: true`).
- Success, validation, and application-error responses use the standard `{ status, message, data }` envelope. See [`authApiIntegrationGuide.md`](./authApiIntegrationGuide.md) for the full envelope reference — it applies here unchanged.
- **`period` is required** on the admin and instructor routes. Omitting it or sending an invalid value returns `400 Validation failed`.
- Strict validation is used on those two routes: do not send any query param other than `period`. The student route has no query validation — any query params are ignored.
- Requests under `/api` are rate-limited to 5000 per IP per hour.
- Every `*AvatarUrl` field (`studentAvatarUrl`, `instructorAvatarUrl`) is currently **always `null`** because of a backend bug (it reads a property the avatar formatter never sets). Fetch the user through the user APIs if you need the avatar.

## Period filter

| Value | Date range |
| --- | --- |
| `week` | Last 7 days |
| `month` | Last 30 days |
| `year` | Last 365 days |

The window is rolling, counted back from the moment of the request. Period-filtered metrics use it; the all-time ones are marked below (admin `recentUsers`; instructor `totalCourses`, `averageRating`, `coursePerformance`, `recentReviews`).

Trend buckets (dates are grouped in UTC):

- `week` — by day-of-week name over the last 7 days.
- `month` — by day-of-month over the last 30 days: days 1–7 → `Week 1`, 8–14 → `Week 2`, 15–21 → `Week 3`, 22–31 → `Week 4`. Because the window spans two calendar months, a bucket can mix days from both.
- `year` — by calendar month name over the last 365 days, so the current month's bucket can also include the same month of last year.

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
        "_id": "66c0a1b2c3d4e5f678901111",
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
| `totalStudents` | Count of users with `role=student` registered in period (verified or not) | ✅ Yes |
| `totalInstructors` | Count of users with `role=instructor` registered in period (verified or not) | ✅ Yes |
| `totalCourses` | Count of courses created in period, regardless of verification status | ✅ Yes |

### `topPerformingCourses` details

- Returns **at most 5** courses. May return fewer if less than 5 courses have enrollments in the period.
- Ranked by `enrollmentsInPeriod` descending.
- `adminCommissionEarned` = sum of `adminCommission` on `paid` transactions for that course in the period.
- `averageRating` is the all-time rating from the Course document (not period-filtered).
- `userGrowth` counts registrations of every role (admins included).

### `recentUsers` details

- Always returns the **5 most recently joined users** across all roles, with only `_id`, `fullName`, `email`, `role`, `isVerified`, `createdAt`.
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

### Query parameters

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `period` | `"week" \| "month" \| "year"` | ✅ Yes | The time window for period-filtered metrics. |

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Instructor dashboard fetched successfully",
  "data": {
    "stats": {
      "totalRevenue": 1,
      "adminCommission": 0,
      "totalStudents": 1,
      "totalCourses": 1,
      "averageRating": 0.0
    },
    "revenueByCourse": [
      {
        "courseId": "66d1a1b2c3d4e5f678901234",
        "title": "Complete Full-Stack Web Development Bootcamp",
        "courseTitle": "Complete Full-Stack Web Development Bootcamp",
        "revenue": 1
      }
    ],
    "enrollmentsTrend": {
      "Sunday": 0,
      "Monday": 0,
      "Tuesday": 0,
      "Wednesday": 0,
      "Thursday": 0,
      "Friday": 1,
      "Saturday": 0
    },
    "coursePerformance": [
      {
        "courseId": "66d1a1b2c3d4e5f678901234",
        "title": "Complete Full-Stack Web Development Bootcamp",
        "courseTitle": "Complete Full-Stack Web Development Bootcamp",
        "isVerified": true,
        "enrollments": 2,
        "rating": 0,
        "avgCompletion": 0.0,
        "revenue": 2
      }
    ],
    "recentReviews": [
      {
        "reviewId": "66d1b2c3d4e5f67890123456",
        "courseId": "66d1a1b2c3d4e5f678901234",
        "courseTitle": "Complete Full-Stack Web Development Bootcamp",
        "studentName": "John Doe",
        "studentAvatarUrl": null,
        "rating": 5,
        "review": "Excellent course, highly recommend!",
        "feedback": "Excellent course, highly recommend!",
        "createdAt": "2026-10-05T12:00:00.000Z"
      }
    ]
  }
}
```

### `stats` field details

| Field | Source | Period-filtered? |
| --- | --- | --- |
| `totalRevenue` | Sum of `instructorRevenue` on `paid` transactions for this instructor | ✅ Yes |
| `adminCommission` | Sum of `adminCommission` on `paid` transactions for this instructor | ✅ Yes |
| `totalStudents` | Distinct count of students whose enrollment in this instructor's courses was created in the period | ✅ Yes |
| `totalCourses` | Total count of courses owned by this instructor (any verification status) | ❌ No (All-time) |
| `averageRating` | Combined average rating across all reviews of this instructor, rounded to 1 decimal | ❌ No (All-time) |

### `revenueByCourse` details

- Returns revenue earned by the instructor for each course in the selected period (only courses with at least one `paid` transaction in the period; deleted courses are left out).
- Ranked by `revenue` descending.
- Used to render the circular / doughnut chart.

### `enrollmentsTrend` details

Follows the exact same period structure as `revenueTrend`:
- **`period=week`**: `{ Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday }`
- **`period=month`**: `{ "Week 1", "Week 2", "Week 3", "Week 4" }`
- **`period=year`**: `{ January, February, ..., December }`

### `coursePerformance` details

- Returns **top 5 courses** of this instructor (any verification status) ranked by `totalStudentsEnrolled` descending.
- `enrollments`, `revenue`, `rating`, and `avgCompletion` are **all-time** (not period-filtered).
- `enrollments` is the course's current enrollment count; `revenue` is the course's `totalRevenueInstructor`.
- `avgCompletion` represents the average watch percentage across enrolled students, rounded to 1 decimal.

### `recentReviews` details

- Returns the **5 most recent reviews** across all courses of this instructor.
- **Not period-filtered** — always all-time latest reviews.
- `review` and `feedback` carry the same text. Missing references fall back to `courseTitle: "Unknown Course"` / `studentName: "Anonymous"`.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| `400` | `Validation failed` | `period` is missing or invalid. |
| `401` | *(see auth guide)* | Access-token cookie missing/invalid/expired. |
| `403` | `You do not have permission to perform this action` | Non-instructor role calling this endpoint. |

---

## API 3 — Student Dashboard

`GET /api/v1/dashboard/student`

The student dashboard does not depend on any period filter — all metrics reflect the student's current enrollments, watch progress, recent purchases, and reviews.

### Query parameters

None. This route does not validate its query string, so any params (including `period`) are simply ignored.

### Success response

HTTP `200`

```json
{
  "status": "success",
  "message": "Student dashboard fetched successfully",
  "data": {
    "stats": {
      "enrolledCourses": 3,
      "completedCourses": 1,
      "averageCompletionPercentage": 45.5,
      "totalWatchTime": 240
    },
    "continueWatching": [
      {
        "enrollmentId": "66e1a1b2c3d4e5f678901234",
        "courseId": "66d1a1b2c3d4e5f678901234",
        "title": "Complete Full-Stack Web Development Bootcamp",
        "thumbnailUrl": "https://s3.<region>.amazonaws.com/<bucket>/5.0/courses/thumbnails/<uuid>-bootcamp-thumbnail.jpeg",
        "instructorName": "Dr John Smith",
        "instructorAvatarUrl": null,
        "watchPercentage": 50,
        "totalDurationWatchedInMinutes": 120,
        "totalDurationInMinutes": 240,
        "mostRecentlySeen": true,
        "updatedAt": "2026-10-06T15:30:00.000Z"
      }
    ],
    "recentTransactions": [
      {
        "id": "66f1a1b2c3d4e5f678901555",
        "transactionId": "pi_3PXXXXXXXXXXXXXX",
        "courseId": "66d1a1b2c3d4e5f678901234",
        "courseTitle": "Complete Full-Stack Web Development Bootcamp",
        "courseThumbnailUrl": "https://s3.<region>.amazonaws.com/<bucket>/5.0/courses/thumbnails/<uuid>-bootcamp-thumbnail.jpeg",
        "isCourseDeleted": false,
        "instructorName": "Dr John Smith",
        "instructorAvatarUrl": null,
        "amountPaid": 49.99,
        "paymentStatus": "paid",
        "currency": "usd",
        "amountPaidAt": "2026-10-01T12:00:00.000Z",
        "createdAt": "2026-10-01T12:00:00.000Z"
      }
    ],
    "recentReviews": [
      {
        "reviewId": "66d1b2c3d4e5f67890123456",
        "courseId": "66d1a1b2c3d4e5f678901234",
        "courseTitle": "Complete Full-Stack Web Development Bootcamp",
        "courseThumbnailUrl": "https://s3.<region>.amazonaws.com/<bucket>/5.0/courses/thumbnails/<uuid>-bootcamp-thumbnail.jpeg",
        "instructorName": "Dr John Smith",
        "instructorAvatarUrl": null,
        "rating": 5,
        "review": "Clear explanations and great real-world examples!",
        "feedback": "Clear explanations and great real-world examples!",
        "createdAt": "2026-10-05T12:00:00.000Z"
      }
    ]
  }
}
```

### `stats` field details

| Field | Description | Source |
| --- | --- | --- |
| `enrolledCourses` | Total courses enrolled by this student | Count of `Enrollment` documents |
| `completedCourses` | Courses where `watchedCompletely: true` | Count of completed `Enrollment` documents |
| `averageCompletionPercentage` | Average `watchPercentage` across all enrolled courses | Calculated from `Enrollment.watchPercentage` |
| `totalWatchTime` | Total watch time across all enrolled courses (in minutes) | Sum of `Enrollment.totalDurationWatchedInMinutes` |

### `continueWatching` details

- Returns up to **3 courses** to resume watching.
- First takes in-progress courses (`watchPercentage > 0` and not completed), `mostRecentlySeen` first, then latest activity (`updatedAt` descending). Courses never started (`watchPercentage: 0`) are not included.
- If fewer than 3 are in progress, the list is topped up with **completed** courses (most recently updated first).

### `recentTransactions` details

- Returns the **5 most recent transactions** made by the student, of any `paymentStatus` (`pending`, `failed` and `refunded` included).
- Sorted by `createdAt` descending.
- Each item includes `isCourseDeleted: boolean`. If the course was deleted, `courseId`/`courseTitle` come from the preserved snapshot and `courseThumbnailUrl` is `null`.

### `recentReviews` details

- Returns the **5 most recent reviews** submitted by the student.
- Sorted by `createdAt` descending.

### Possible errors

| HTTP status | Message | When |
| --- | --- | --- |
| `401` | *(see auth guide)* | Access-token cookie missing/invalid/expired. |
| `403` | `You do not have permission to perform this action` | Non-student role calling this endpoint. |

---

## Frontend types

Copy [`src/response-types/dashboardResponseTypes.ts`](../../src/response-types/dashboardResponseTypes.ts) into the frontend project. It is a pure TypeScript file with no backend imports (it reuses `SuccessApiResponse`/`ApiErrorResponse` from [`authResponseTypes.ts`](../../src/response-types/authResponseTypes.ts)) and exports:

| Export | Description |
| --- | --- |
| `DashboardPeriod` | `"week" \| "month" \| "year"` |
| `TrendRecord` | `Record<string, number>` — shape for trend breakdowns |
| `AdminDashboardStats` | Admin stats card data |
| `TopPerformingCourse` | Admin single course in top-5 list |
| `AdminRecentUser` | Admin single user in recent-users list |
| `AdminDashboardData` | Full `data` payload of admin dashboard |
| `GetAdminDashboardResponse` | Complete typed response union for admin dashboard |
| `InstructorDashboardStats` | Instructor stats card data |
| `InstructorRevenueByCourse` | Course revenue slice for circular chart |
| `InstructorCoursePerformance` | Single course row in course performance table |
| `InstructorRecentReview` | Single review row in recent reviews table |
| `InstructorDashboardData` | Full `data` payload of instructor dashboard |
| `GetInstructorDashboardResponse` | Complete typed response union for instructor dashboard |
| `StudentDashboardStats` | Student stats card data |
| `StudentContinueWatchingItem` | Single course in continue watching list |
| `StudentRecentTransaction` | Single transaction in student recent transactions |
| `StudentRecentReview` | Single review in student recent reviews |
| `StudentDashboardData` | Full `data` payload of student dashboard |
| `GetStudentDashboardResponse` | Complete typed response union for student dashboard |

