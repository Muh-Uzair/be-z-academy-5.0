import { Router } from "express";
import {
  createReview,
  getReviews,
  getReviewDetails,
  updateReview,
  deleteReview,
} from "@src/controllers/reviewController";
import validation from "@src/middlewares/validation";
import protect from "@src/middlewares/protect";
import restrictTo from "@src/middlewares/restrictTo";
import { Role } from "@src/models/userModel";
import {
  createReviewSchema,
  updateReviewSchema,
  reviewIdParamsSchema,
  getReviewsQuerySchema,
} from "@src/validations/reviewValidation";

const reviewRouter = Router();

reviewRouter.post(
  "/",
  protect,
  restrictTo(Role.Student),
  validation(createReviewSchema, "body"),
  createReview,
);

reviewRouter.get(
  "/",
  validation(getReviewsQuerySchema, "query"),
  getReviews,
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

// Delete is open to any authenticated user; ownership (author or admin) is
// enforced in the service layer since either role may delete a review.
reviewRouter.delete(
  "/:id",
  protect,
  validation(reviewIdParamsSchema, "params"),
  deleteReview,
);

export default reviewRouter;
