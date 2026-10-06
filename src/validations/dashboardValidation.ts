import { z } from "zod";

export const dashboardQuerySchema = z
  .object({
    period: z.enum(["week", "month", "year"], {
      error: "Period is required and must be 'week', 'month', or 'year'",
    }),
  })
  .strict();
