import { z } from "zod";
import {
  reviewIdParamsSchema,
  createReviewSchema,
  updateReviewSchema,
  getReviewsQuerySchema,
} from "@src/validations/reviewValidations";

export type ReviewIdParams = z.infer<typeof reviewIdParamsSchema>;
export type CreateReviewBody = z.infer<typeof createReviewSchema>;
export type UpdateReviewBody = z.infer<typeof updateReviewSchema>;
export type GetReviewsQuery = z.infer<typeof getReviewsQuerySchema>;
