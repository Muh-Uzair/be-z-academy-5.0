import { z } from "zod";
import {
  reviewIdParamsSchema,
  createReviewSchema,
  updateReviewSchema,
  getReviewsQuerySchema,
  reviewByCourseParamsSchema,
  getReviewsByCourseQuerySchema,
} from "../validations/reviewValidation";

export type ReviewIdParams = z.infer<typeof reviewIdParamsSchema>;
export type CreateReviewBody = z.infer<typeof createReviewSchema>;
export type UpdateReviewBody = z.infer<typeof updateReviewSchema>;
export type GetReviewsQuery = z.infer<typeof getReviewsQuerySchema>;
export type ReviewByCourseParams = z.infer<typeof reviewByCourseParamsSchema>;
export type GetReviewsByCourseQuery = z.infer<typeof getReviewsByCourseQuerySchema>;
