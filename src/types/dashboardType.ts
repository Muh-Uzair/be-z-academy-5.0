import { z } from "zod";
import { Role } from "../models/userModel";
import { dashboardQuerySchema } from "../validations/dashboardValidation";

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type DashboardPeriod = DashboardQuery["period"];

export interface DashboardAuthUser {
  id: string;
  role: Role;
}

// ─── Admin Dashboard Types ────────────────────────────────────────────────────

export interface AdminDashboardStats {
  totalRevenue: number;
  adminCommission: number;
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
}

export interface TopPerformingCourse {
  courseId: string;
  title: string;
  instructorName: string;
  enrollmentsInPeriod: number;
  averageRating: number;
  adminCommissionEarned: number;
}

export interface AdminRecentUser {
  fullName: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: Date;
}

export interface AdminDashboardData {
  stats: AdminDashboardStats;
  revenueTrend: Record<string, number>;
  userGrowth: Record<string, number>;
  topPerformingCourses: TopPerformingCourse[];
  recentUsers: AdminRecentUser[];
}

// ─── Instructor Dashboard Types ───────────────────────────────────────────────

export interface InstructorDashboardStats {
  totalRevenue: number;
  adminCommission: number;
  totalStudents: number;
  totalCourses: number;
  averageRating: number;
}

export interface InstructorRevenueByCourse {
  courseId: string;
  title: string;
  courseTitle: string;
  revenue: number;
}

export interface InstructorCoursePerformance {
  courseId: string;
  title: string;
  courseTitle: string;
  isVerified: boolean;
  enrollments: number;
  rating: number;
  avgCompletion: number;
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
  createdAt: Date;
}

export interface InstructorDashboardData {
  stats: InstructorDashboardStats;
  revenueByCourse: InstructorRevenueByCourse[];
  enrollmentsTrend: Record<string, number>;
  coursePerformance: InstructorCoursePerformance[];
  recentReviews: InstructorRecentReview[];
}

// ─── Student Dashboard Types ──────────────────────────────────────────────────

export interface StudentDashboardStats {
  enrolledCourses: number;
  completedCourses: number;
  averageCompletionPercentage: number;
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
  updatedAt: Date;
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
  amountPaidAt: Date | null;
  createdAt: Date;
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
  createdAt: Date;
}

export interface StudentDashboardData {
  stats: StudentDashboardStats;
  continueWatching: StudentContinueWatchingItem[];
  recentTransactions: StudentRecentTransaction[];
  recentReviews: StudentRecentReview[];
}


