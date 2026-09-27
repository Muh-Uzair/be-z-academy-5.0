import { z } from "zod";
import { adminDashboardQuerySchema } from "../validations/dashboardValidation";

export type AdminDashboardQuery = z.infer<typeof adminDashboardQuerySchema>;
