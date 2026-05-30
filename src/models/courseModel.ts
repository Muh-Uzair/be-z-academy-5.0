import { model, models, Schema, type InferSchemaType } from "mongoose";

export enum CourseLevel {
  Beginner = "beginner",
  Intermediate = "intermediate",
  Advanced = "advanced",
}

const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 120,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 5000,
    },

    thumbnail: {
      type: String,
      required: true,
      trim: true,
    },

    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    level: {
      type: String,
      required: true,
      enum: Object.values(CourseLevel),
    },

    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationRejectionReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalStudentsEnrolled: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalDurationInMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalRevenueInstructor: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalRevenueAdmin: {
      type: Number,
      default: 0,
      min: 0,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  },
);

type CourseType = InferSchemaType<typeof courseSchema>;

const CourseModel = models.Course || model<CourseType>("Course", courseSchema);

export default CourseModel;

export type { CourseType };
