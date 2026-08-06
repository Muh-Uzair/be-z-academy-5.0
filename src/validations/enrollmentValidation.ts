import { z } from "zod";

export const enrollmentIdParamsSchema = z
  .object({
    id: z.string().min(1, { error: "Enrollment id is required" }),
  })
  .strict();

export const getEnrollmentsQuerySchema = z
  .object({
    student: z.string().trim().min(1).optional(),
    course: z.string().trim().min(1).optional(),
    instructor: z.string().trim().min(1).optional(),
    transaction: z.string().trim().min(1).optional(),
    watchedCompletely: z
      .enum(["true", "false"])
      .transform((val) => val === "true")
      .optional(),
    certificateIssued: z
      .enum(["true", "false"])
      .transform((val) => val === "true")
      .optional(),
    projection: z.string().trim().min(1).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).default(10),
    sortBy: z.string().trim().min(1).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();
