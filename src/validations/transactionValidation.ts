import { z } from "zod";

export const transactionIdParamsSchema = z.object({
  id: z.string().min(1, { error: "Transaction id is required" }),
});

export const getTransactionsQuerySchema = z.object({
  student: z.string().trim().min(1).optional(),
  course: z.string().trim().min(1).optional(),
  instructor: z.string().trim().min(1).optional(),
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
  search: z.string().trim().min(1).optional(),
  projection: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
  sortBy: z.string().trim().min(1).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
