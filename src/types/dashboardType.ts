import { z } from "zod";
import { Role } from "../models/userModel";
import { dashboardQuerySchema } from "../validations/dashboardValidation";

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type DashboardPeriod = DashboardQuery["period"];

export interface DashboardAuthUser {
  id: string;
  role: Role;
}
