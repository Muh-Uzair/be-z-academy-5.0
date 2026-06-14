import { model, models, Schema, type InferSchemaType } from "mongoose";

const reviewSchema = new Schema(
  {
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    feedback: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000,
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

type ReviewType = InferSchemaType<typeof reviewSchema>;

const ReviewModel = models.Review || model<ReviewType>("Review", reviewSchema);

export default ReviewModel;
export type { ReviewType };
