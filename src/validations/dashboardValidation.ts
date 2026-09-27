import { z } from "zod";

export const adminDashboardQuerySchema = z
  .object({
    period: z.enum(["week", "month", "year"]).default("month"),
  })
  .strict();
