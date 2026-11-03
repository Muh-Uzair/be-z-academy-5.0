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

// DIVIDER Admin Routes ---------------------------------------------------------

// DIVIDER Instructor Routes ---------------------------------------------------------

// DIVIDER Student Routes ---------------------------------------------------------

// (root)/api/v1/reviews
// Api # 1
reviewRouter.post(
  "/",
  protect,
  restrictTo(Role.Student),
  validation(createReviewSchema, "body"),
  createReview,
);

// (root)/api/v1/reviews/:id
// Api # 2
reviewRouter.patch(
  "/:id",
  protect,
  restrictTo(Role.Student),
  validation(reviewIdParamsSchema, "params"),
  validation(updateReviewSchema, "body"),
  updateReview,
);

// DIVIDER Admin + Instructor + Student Routes ---------------------------------------------------------

// (root)/api/v1/reviews/course/:courseId
// Api # 3
reviewRouter.get(
  "/course/:courseId",
  protect,
  restrictTo(Role.Student, Role.Instructor, Role.Admin),
  validation(reviewByCourseParamsSchema, "params"),
  validation(getReviewsByCourseQuerySchema, "query"),
  getReviewsByCourseId,
);

// DIVIDER Admin + Instructor Routes ---------------------------------------------------------

// DIVIDER Admin + Student Routes ---------------------------------------------------------

// Only a student (who owns the review) or an admin (for any review) may delete a review.
// (root)/api/v1/reviews/:id
// Api # 4
reviewRouter.delete(
  "/:id",
  protect,
  restrictTo(Role.Student, Role.Admin),
  validation(reviewIdParamsSchema, "params"),
  deleteReview,
);

// DIVIDER Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Public Routes ---------------------------------------------------------

// (root)/api/v1/reviews
// Api # 5
reviewRouter.get("/", validation(getReviewsQuerySchema, "query"), getReviews);

// (root)/api/v1/reviews/:id
// Api # 6
reviewRouter.get(
  "/:id",
  validation(reviewIdParamsSchema, "params"),
  getReviewDetails,
);

export default reviewRouter;
