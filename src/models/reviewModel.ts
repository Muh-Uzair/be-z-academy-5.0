import { model, models, Schema, type InferSchemaType } from "mongoose";
import {
  REVIEW_RATING_MIN,
  REVIEW_RATING_MAX,
  REVIEW_FEEDBACK_MIN_LENGTH,
  REVIEW_FEEDBACK_MAX_LENGTH,
} from "@src/constants/reviewConstant";

const reviewSchema = new Schema(
  {
    rating: {
      type: Number,
      required: true,
      min: REVIEW_RATING_MIN,
      max: REVIEW_RATING_MAX,
    },

    feedback: {
      type: String,
      required: true,
      trim: true,
      minlength: REVIEW_FEEDBACK_MIN_LENGTH,
      maxlength: REVIEW_FEEDBACK_MAX_LENGTH,
    },

    reviewBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// One review per user per course
reviewSchema.index({ reviewBy: 1, course: 1 }, { unique: true });

// Indexes to support APIFeatures query filtering and default sorting.
reviewSchema.index({ course: 1 });
reviewSchema.index({ instructor: 1 });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ createdAt: -1 });

type ReviewType = InferSchemaType<typeof reviewSchema>;

const ReviewModel = models.Review || model<ReviewType>("Review", reviewSchema);

export default ReviewModel;
export type { ReviewType };
