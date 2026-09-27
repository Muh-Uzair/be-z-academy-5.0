import { z } from "zod";
import { adminDashboardQuerySchema } from "../validations/dashboardValidation";

export type AdminDashboardQuery = z.infer<typeof adminDashboardQuerySchema>;

// Instructor dashboard uses the same period query param as admin
export type InstructorDashboardQuery = AdminDashboardQuery;

// Student dashboard has no period filter — empty query
export type StudentDashboardQuery = Record<string, never>;
