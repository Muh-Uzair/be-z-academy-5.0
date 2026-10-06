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

// ─── Instructor Dashboard ─────────────────────────────────────────────────────

export interface InstructorDashboardStats {
  // Total instructor revenue earned in the period
  totalRevenue: number;
  // Commission earned by platform/admin from this instructor in the period
  adminCommission: number;
  // Count of distinct students enrolled in this instructor's courses in the period
  totalStudents: number;
  // Total courses of this instructor (all-time)
  totalCourses: number;
  // Average rating across all reviews of this instructor (all-time)
  averageRating: number;
}

export interface InstructorRevenueByCourse {
  courseId: string;
  title: string;
  courseTitle: string;
  // Revenue earned by the instructor for this course in the period
  revenue: number;
}

export interface InstructorCoursePerformance {
  courseId: string;
  title: string;
  courseTitle: string;
  isVerified: boolean;
  // Total students enrolled in this course (all-time)
  enrollments: number;
  // Average rating for this course (all-time)
  rating: number;
  // Average watch percentage across all enrolled students (all-time)
  avgCompletion: number;
  // Total revenue earned by the instructor for this course (all-time)
  revenue: number;
}

export interface InstructorRecentReview {
  reviewId: string;
  courseId: string;
  courseTitle: string;
  studentName: string;
  studentAvatarUrl: string | null;
  rating: number;
  review: string;
  feedback: string;
  createdAt: string;
}

export interface InstructorDashboardData {
  stats: InstructorDashboardStats;
  // Revenue breakdown by course in the selected period (data for circular/doughnut chart)
  revenueByCourse: InstructorRevenueByCourse[];
  // Enrollments breakdown by time window in the selected period (week/month/year)
  enrollmentsTrend: TrendRecord;
  // Top 5 best performing courses ranked by enrollments (all-time)
  coursePerformance: InstructorCoursePerformance[];
  // 5 most recent reviews across all courses (all-time)
  recentReviews: InstructorRecentReview[];
}

// API: GET /api/v1/dashboard/instructor?period=week|month|year
// Response: { status, message, data: InstructorDashboardData }
export type GetInstructorDashboardResponse =
  | SuccessApiResponse<
      InstructorDashboardData,
      "Instructor dashboard fetched successfully"
    >
  | ApiErrorResponse;

// ─── Student Dashboard ────────────────────────────────────────────────────────

export interface StudentDashboardStats {
  // Total courses currently enrolled by the student
  enrolledCourses: number;
  // Total courses completed (watched completely) by the student
  completedCourses: number;
  // Average completion / watch percentage across all enrolled courses
  averageCompletionPercentage: number;
  // Total watch time in minutes across all enrolled courses
  totalWatchTime: number;
}

export interface StudentContinueWatchingItem {
  enrollmentId: string;
  courseId: string;
  title: string;
  thumbnailUrl: string | null;
  instructorName: string;
  instructorAvatarUrl: string | null;
  watchPercentage: number;
  totalDurationWatchedInMinutes: number;
  totalDurationInMinutes: number;
  mostRecentlySeen: boolean;
  updatedAt: string;
}

export interface StudentRecentTransaction {
  id: string;
  transactionId: string;
  courseId: string;
  courseTitle: string;
  courseThumbnailUrl: string | null;
  instructorName: string;
  instructorAvatarUrl: string | null;
  amountPaid: number;
  paymentStatus: string;
  currency: string;
  amountPaidAt: string | null;
  createdAt: string;
}

export interface StudentRecentReview {
  reviewId: string;
  courseId: string;
  courseTitle: string;
  courseThumbnailUrl: string | null;
  instructorName: string;
  instructorAvatarUrl: string | null;
  rating: number;
  review: string;
  feedback: string;
  createdAt: string;
}

export interface StudentDashboardData {
  stats: StudentDashboardStats;
  // Up to 3 in-progress / recent courses to continue watching
  continueWatching: StudentContinueWatchingItem[];
  // 5 most recent transactions made by the student
  recentTransactions: StudentRecentTransaction[];
  // 5 most recent reviews submitted by the student
  recentReviews: StudentRecentReview[];
}

// API: GET /api/v1/dashboard/student
// Response: { status, message, data: StudentDashboardData }
export type GetStudentDashboardResponse =
  | SuccessApiResponse<
      StudentDashboardData,
      "Student dashboard fetched successfully"
    >
  | ApiErrorResponse;


