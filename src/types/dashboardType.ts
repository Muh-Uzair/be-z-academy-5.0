import { z } from "zod";
import {
  adminDashboardQuerySchema,
  studentDashboardQuerySchema,
} from "../validations/dashboardValidation";

export type AdminDashboardQuery = z.infer<typeof adminDashboardQuerySchema>;

// Instructor dashboard uses the same period query param as admin
export type InstructorDashboardQuery = AdminDashboardQuery;

// Student dashboard query with period filter
export type StudentDashboardQuery = z.infer<typeof studentDashboardQuerySchema>;

