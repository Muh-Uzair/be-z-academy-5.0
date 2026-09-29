import { z } from "zod";

export const adminDashboardQuerySchema = z
  .object({
    period: z.enum(["week", "month", "year"]).default("month"),
  })
  .strict();

export const studentDashboardQuerySchema = z
  .object({
    period: z.enum(["week", "month", "year", "all"]).default("month"),
  })
  .strict();

