import { z } from "zod";

// `period` is required on every dashboard route; the frontend sends "month" by default.
const dashboardPeriodSchema = z.enum(["week", "month", "year"]);

export const adminDashboardQuerySchema = z
  .object({
    period: dashboardPeriodSchema,
  })
  .strict();

export const studentDashboardQuerySchema = z
  .object({
    period: dashboardPeriodSchema,
  })
  .strict();
