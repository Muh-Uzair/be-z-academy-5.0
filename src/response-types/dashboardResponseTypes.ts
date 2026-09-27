// This file is intentionally framework-independent. Copy it directly into a
// frontend project; it has no backend imports and represents JSON values only.

import { SuccessApiResponse, ApiErrorResponse } from "./authResponseTypes";

// ─── Shared Building Blocks ───────────────────────────────────────────────────

/** A single data point on the revenue trend chart. */
export interface RevenueChartPoint {
  /** Bucket label — format depends on the requested period:
   *  - week:  "YYYY-MM-DD"   (one entry per day)
   *  - month: "YYYY-WW"      (one entry per ISO week, 5 buckets)
   *  - year:  "YYYY-MM"      (one entry per month)
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
  /** Array of chart points ordered oldest → newest. Length: 7 (week) | 5 (month) | 12 (year). */
  revenueTrend: RevenueChartPoint[];
  /** Same length and labels as revenueTrend. */
  userGrowth: UserGrowthPoint[];
  /** Up to 5 courses, sorted by totalStudentsEnrolled descending. */
  topCourses: TopCourse[];
  /** Up to 10 most-recently-joined users, any role, sorted by createdAt descending. */
  recentUsers: RecentUser[];
}

// ─── API 1: GET /api/v1/dashboard/admin ───────────────────────────────────────

export type GetAdminDashboardResponse =
  | SuccessApiResponse<AdminDashboardData, "Admin dashboard data fetched successfully">
  | ApiErrorResponse;
