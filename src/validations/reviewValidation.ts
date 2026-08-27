import { z } from "zod";
import {
  REVIEW_RATING_MIN,
  REVIEW_RATING_MAX,
  REVIEW_FEEDBACK_MIN_LENGTH,
  REVIEW_FEEDBACK_MAX_LENGTH,
} from "../constants/reviewConstant";

export const reviewIdParamsSchema = z
  .object({
    id: z.string().min(1, { error: "Review id is required" }),
  })
  .strict();

export const createReviewSchema = z
  .object({
    course: z.string().trim().min(1, { error: "Course id is required" }),
    rating: z.coerce
      .number()
      .int()
      .min(REVIEW_RATING_MIN, {
        error: `Rating must be at least ${REVIEW_RATING_MIN}`,
      })
      .max(REVIEW_RATING_MAX, {
        error: `Rating cannot exceed ${REVIEW_RATING_MAX}`,
      }),
    feedback: z
      .string()
      .trim()
      .min(REVIEW_FEEDBACK_MIN_LENGTH, {
        error: `Feedback must be at least ${REVIEW_FEEDBACK_MIN_LENGTH} characters`,
      })
      .max(REVIEW_FEEDBACK_MAX_LENGTH, {
        error: `Feedback cannot exceed ${REVIEW_FEEDBACK_MAX_LENGTH} characters`,
      }),
  })
  .strict();

export const updateReviewSchema = z
  .object({
    rating: z.coerce
      .number()
      .int()
      .min(REVIEW_RATING_MIN)
      .max(REVIEW_RATING_MAX)
      .optional(),
    feedback: z
      .string()
      .trim()
      .min(REVIEW_FEEDBACK_MIN_LENGTH)
      .max(REVIEW_FEEDBACK_MAX_LENGTH)
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field must be provided to update the review",
  });

export const getReviewsQuerySchema = z
  .object({
    course: z.string().trim().min(1).optional(),
    instructor: z.string().trim().min(1).optional(),
    reviewBy: z.string().trim().min(1).optional(),
    rating: z.coerce
      .number()
      .int()
      .min(REVIEW_RATING_MIN)
      .max(REVIEW_RATING_MAX)
      .optional(),
    search: z.string().trim().min(1).optional(),
    projection: z.string().trim().min(1).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).default(10),
    sortBy: z.string().trim().min(1).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();
