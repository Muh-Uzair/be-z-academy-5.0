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
