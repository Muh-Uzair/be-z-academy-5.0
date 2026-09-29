// This file is intentionally framework-independent. Copy it directly into a
// frontend project; it has no backend imports and represents JSON values only.

import { SuccessApiResponse, ApiErrorResponse } from "./authResponseTypes";

// ─── Shared Building Blocks ───────────────────────────────────────────────────

/** A single data point on the revenue trend chart. */
export interface RevenueChartPoint {
  /** Bucket label — format depends on the requested period:
   *  - week:  "YYYY-MM-DD"   (one entry per day)
   *  - month: "YYYY-WW"      (one entry per ISO week, 5 or 6 buckets)
   *  - year:  "YYYY-MM"      (one entry per month)
   *  All windows/labels are UTC.
   */
  label: string;
  /** Total amount paid by students in this bucket (in USD cents). */
  totalRevenue: number;
  /** Admin commission in this bucket (in USD cents). */
  adminCommission: number;
}

/** A single data point on the user growth chart. */
export interface UserGrowthPoint {
  /** Same format as RevenueChartPoint.label */
  label: string;
  newStudents: number;
  newInstructors: number;
}

/** A summary metric card with current value, previous-period value, and % change. */
export interface SummaryCard {
  /** Value in the selected period. */
  current: number;
  /** Value in the preceding period of the same length. */
  previous: number;
  /** ((current - previous) / previous) * 100, rounded to 1 decimal.
   *  `null` when previous === 0 (avoids division-by-zero). */
  changePercent: number | null;
}

/** Row in the "Top Performing Courses" table. */
export interface TopCourse {
  _id: string;
  title: string;
  instructorName: string;
  totalStudentsEnrolled: number;
  averageRating: number;
  /** Admin commission accumulated on this course (in USD cents). */
  totalRevenueAdmin: number;
}

/** Row in the "Recent Users" table. */
export interface RecentUser {
  _id: string;
  fullName: string;
  email: string;
  role: "admin" | "instructor" | "student";
  isVerified: boolean;
  createdAt: string; // ISO-8601
}

// ─── Dashboard Response ───────────────────────────────────────────────────────

export interface AdminDashboardData {
  /** The period filter that was applied ("week" | "month" | "year"). */
  period: "week" | "month" | "year";
  summary: {
    totalRevenue: SummaryCard;
    totalCommission: SummaryCard;
    totalStudents: SummaryCard;
    totalInstructors: SummaryCard;
    totalCourses: SummaryCard;
  };
  /** Array of chart points ordered oldest → newest. Length: 7 (week) | 5 or 6 (month) | 12 (year). */
  revenueTrend: RevenueChartPoint[];
  /** Same length and labels as revenueTrend. */
  userGrowth: UserGrowthPoint[];
  /** Up to 5 courses, sorted by totalStudentsEnrolled descending. */
  topCourses: TopCourse[];
  /** Up to 5 most-recently-joined users, any role, sorted by createdAt descending. */
  recentUsers: RecentUser[];
}

// ─── API 1: GET /api/v1/dashboard/admin ───────────────────────────────────────

export type GetAdminDashboardResponse =
  | SuccessApiResponse<AdminDashboardData, "Admin dashboard data fetched successfully">
  | ApiErrorResponse;

// ─── Instructor Dashboard ─────────────────────────────────────────────────────

export interface InstructorSummaryCard {
  current: number;
  previous: number;
  changePercent: number | null;
}

/** One slice of the revenue-by-course donut chart. */
export interface CourseRevenueSlice {
  courseId: string;
  courseTitle: string;
  /** Instructor's share of revenue (in USD cents). */
  instructorRevenue: number;
}

/** One point on the enrollments trend line chart. */
export interface EnrollmentTrendPoint {
  /** Same label format as AdminDashboardData chart points. */
  label: string;
  newEnrollments: number;
}

/** Row in the Course Performance table. */
export interface InstructorCoursePerformance {
  _id: string;
  title: string;
  isVerified: boolean;
  totalStudentsEnrolled: number;
  averageRating: number;
  /** Average watch percentage across all enrollments (0–100, 1 decimal). */
  avgCompletionPercent: number;
  /** All-time cumulative instructor revenue for this course (in USD cents). */
  totalRevenueInstructor: number;
}

/** Row in the Recent Reviews table. */
export interface InstructorRecentReview {
  _id: string;
  rating: number;
  feedback: string;
  courseTitle: string;
  studentName: string;
  createdAt: string; // ISO-8601
}

// API 2: GET /api/v1/dashboard/instructor
export interface InstructorDashboardData {
  period: "week" | "month" | "year";
  summary: {
    totalRevenue: InstructorSummaryCard;
    totalAdminCommission: InstructorSummaryCard;
    totalStudents: InstructorSummaryCard;
    totalCourses: {
      live: number;
      pending: number;
    };
    /** Weighted average rating across all verified courses (1 decimal). 0 if no reviews yet. */
    averageRating: number;
  };
  /** Up to 8 slices sorted by instructorRevenue descending (scoped to selected period). */
  revenueByCourseTrend: CourseRevenueSlice[];
  /** Enrollment count per bucket, same length/labels as admin revenueTrend. */
  enrollmentTrend: EnrollmentTrendPoint[];
  /** Up to 5 courses by this instructor, sorted by totalStudentsEnrolled descending. */
  coursePerformance: InstructorCoursePerformance[];
  /** 5 most recent reviews across all instructor's courses. */
  recentReviews: InstructorRecentReview[];
}

export type GetInstructorDashboardResponse =
  | SuccessApiResponse<InstructorDashboardData, "Instructor dashboard data fetched successfully">
  | ApiErrorResponse;

// ─── Student Dashboard ────────────────────────────────────────────────────────

export interface StudentSummaryCards {
  totalEnrolledCourses: number;
  completedCourses: number;
  activeCourses: number;
  /** Average watchPercentage across active (non-completed) enrollments (0–100, 1 decimal). */
  overallProgressPercent: number;
  /** Sum of all watched minutes across all enrollments. */
  totalWatchTimeInMinutes: number;
}

export interface ContinueWatchingItem {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  courseLevel: "beginner" | "intermediate" | "advanced";
  /** Presigned public S3 URL, or null if no thumbnail. */
  courseThumbnailUrl: string | null;
  instructorName: string;
  totalDurationInMinutes: number;
  totalDurationWatchedInMinutes: number;
  /** Percentage (0–100). */
  watchPercentage: number;
}

export type ActivityEventType = "enrolled" | "completed" | "certificate_earned";

export interface StudentActivityEvent {
  type: ActivityEventType;
  courseTitle: string;
  courseId: string;
  /** ISO-8601 timestamp when the event occurred. */
  occurredAt: string;
}

// API 3: GET /api/v1/dashboard/student
export interface StudentDashboardData {
  /** The period filter that was applied. Filters `summary` and `recentActivity` only. */
  period: "week" | "month" | "year";
  summary: StudentSummaryCards;
  /** Up to 3 most-recently-watched in-progress courses. Not affected by `period`. */
  continueWatching: ContinueWatchingItem[];
  /** Up to 5 most recent events across enrolled, completed, certificate_earned. */
  recentActivity: StudentActivityEvent[];
}

export type GetStudentDashboardResponse =
  | SuccessApiResponse<StudentDashboardData, "Student dashboard data fetched successfully">
  | ApiErrorResponse;
