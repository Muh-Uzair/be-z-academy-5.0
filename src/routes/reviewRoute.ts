import { Router } from "express";
import {
  createReview,
  getReviews,
  getReviewDetails,
  getReviewsByCourseId,
  updateReview,
  deleteReview,
} from "../controllers/reviewController";
import validation from "../middlewares/validation";
import protect from "../middlewares/protect";
import restrictTo from "../middlewares/restrictTo";
import { Role } from "../models/userModel";
import {
  createReviewSchema,
  updateReviewSchema,
  reviewIdParamsSchema,
  getReviewsQuerySchema,
  reviewByCourseParamsSchema,
  getReviewsByCourseQuerySchema,
} from "../validations/reviewValidation";

const reviewRouter = Router();

reviewRouter.post(
  "/",
  protect,
  restrictTo(Role.Student),
  validation(createReviewSchema, "body"),
  createReview,
);

reviewRouter.get("/", validation(getReviewsQuerySchema, "query"), getReviews);

reviewRouter.get(
  "/course/:courseId",
  protect,
  restrictTo(Role.Student, Role.Instructor, Role.Admin),
  validation(reviewByCourseParamsSchema, "params"),
  validation(getReviewsByCourseQuerySchema, "query"),
  getReviewsByCourseId,
);

reviewRouter.get(
  "/:id",
  validation(reviewIdParamsSchema, "params"),
  getReviewDetails,
);

reviewRouter.patch(
  "/:id",
  protect,
  restrictTo(Role.Student),
  validation(reviewIdParamsSchema, "params"),
  validation(updateReviewSchema, "body"),
  updateReview,
);

// Only a student (who owns the review) or an admin (for any review) may delete a review.
reviewRouter.delete(
  "/:id",
  protect,
  restrictTo(Role.Student, Role.Admin),
  validation(reviewIdParamsSchema, "params"),
  deleteReview,
);

export default reviewRouter;
