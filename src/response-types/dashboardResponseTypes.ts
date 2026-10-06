// This file is intentionally framework-independent. Copy it directly into a
// frontend project; it has no backend imports and represents JSON values only.

import { SuccessApiResponse, ApiErrorResponse } from "./authResponseTypes";

// ─── Shared Sub-types ─────────────────────────────────────────────────────────

export type DashboardPeriod = "week" | "month" | "year";

// revenueTrend / userGrowth key shapes vary by period:
//   week  → { Sunday: 0, Monday: 0, ..., Saturday: 0 }
//   month → { "Week 1": 0, "Week 2": 0, "Week 3": 0, "Week 4": 0 }
//   year  → { January: 0, February: 0, ..., December: 0 }
export type TrendRecord = Record<string, number>;

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  // Total revenue (sum of amountPaid on paid transactions) in the period
  totalRevenue: number;
  // Admin commission earned (sum of adminCommission on paid transactions) in the period
  adminCommission: number;
  // New students registered in the period
  totalStudents: number;
  // New instructors registered in the period
  totalInstructors: number;
  // New verified courses created in the period
  totalCourses: number;
}

export interface TopPerformingCourse {
  courseId: string;
  title: string;
  instructorName: string;
  // Number of enrollments for this course in the selected period
  enrollmentsInPeriod: number;
  averageRating: number;
  // Sum of adminCommission on paid transactions for this course in the period
  adminCommissionEarned: number;
}

export interface AdminRecentUser {
  fullName: string;
  email: string;
  role: "admin" | "instructor" | "student";
  isVerified: boolean;
  createdAt: string;
}

export interface AdminDashboardData {
  stats: AdminDashboardStats;
  // Revenue broken down by the selected period (see TrendRecord comment above)
  revenueTrend: TrendRecord;
  // New user registrations broken down by the selected period
  userGrowth: TrendRecord;
  // Top 5 courses ranked by enrollments in the period (may be fewer than 5 if not enough courses)
  topPerformingCourses: TopPerformingCourse[];
  // 5 most recently joined users — all-time, not period-filtered
  recentUsers: AdminRecentUser[];
}

// API: GET /api/v1/dashboard/admin?period=week|month|year
// Response: { status, message, data: AdminDashboardData }
export type GetAdminDashboardResponse =
  | SuccessApiResponse<AdminDashboardData, "Admin dashboard fetched successfully">
  | ApiErrorResponse;
