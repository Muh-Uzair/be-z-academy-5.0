import { z } from "zod";
import { adminDashboardQuerySchema } from "../validations/dashboardValidation";

export type AdminDashboardQuery = z.infer<typeof adminDashboardQuerySchema>;

// Instructor dashboard uses the same period query param as admin
export type InstructorDashboardQuery = AdminDashboardQuery;

