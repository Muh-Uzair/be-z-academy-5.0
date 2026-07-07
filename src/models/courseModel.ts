import { model, models, Schema, type InferSchemaType } from "mongoose";
import { getPublicS3Url } from "@src/services/s3Services";

export enum CourseLevel {
  Beginner = "beginner",
  Intermediate = "intermediate",
  Advanced = "advanced",
}

const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters"],
      maxlength: [120, "Title cannot exceed 120 characters"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [20, "Description must be at least 20 characters"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },

    thumbnailKey: {
      type: String,
      required: [true, "Thumbnail key is required"],
      trim: true,
    },

    videoKey: {
      type: String,
      required: [true, "Video key is required"],
      trim: true,
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },

    level: {
      type: String,
      required: [true, "Level is required"],
      enum: {
        values: Object.values(CourseLevel),
        message: "Level must be one of: beginner, intermediate, advanced",
      },
    },

    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Instructor is required"],
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationRejectionReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: [500, "Rejection reason cannot exceed 500 characters"],
    },

    lastVerificationRejectedAt: {
      type: Date,
      default: null,
    },

    averageRating: {
      type: Number,
    default: 0,
      min: [0, "Average rating cannot be negative"],
      max: [5, "Average rating cannot exceed 5"],
    },

    totalReviews: {
      type: Number,
      default: 0,
      min: [0, "Total reviews cannot be negative"],
    },

    totalStudentsEnrolled: {
      type: Number,
      default: 0,
      min: [0, "Total students enrolled cannot be negative"],
    },

    totalDurationInMinutes: {
      type: Number,
      default: 0,
      min: [0, "Total duration cannot be negative"],
    },

    totalRevenueInstructor: {
      type: Number,
      default: 0,
      min: [0, "Total instructor revenue cannot be negative"],
    },

    totalRevenueAdmin: {
      type: Number,
      default: 0,
      min: [0, "Total admin revenue cannot be negative"],
    },

    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
    id: false,
  },
);

courseSchema.index({ title: 1, instructor: 1 }, { unique: true });

// videoKey is intentionally NOT exposed as a virtual/public URL here — the
// video is private, so a signed GET URL must be generated per-request in the
// service layer (async), which mongoose virtuals/aggregate hooks cannot do.

courseSchema.virtual("thumbnailUrl").get(function () {
  return getPublicS3Url(this.thumbnailKey);
});

courseSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.thumbnailKey;
    delete ret.videoKey;
    return ret;
  },
});

courseSchema.post("aggregate", function (docs) {
  docs.forEach((doc) => {
    doc.thumbnailUrl = getPublicS3Url(doc.thumbnailKey);
    delete doc.thumbnailKey;
  });
});

type CourseType = InferSchemaType<typeof courseSchema>;

const CourseModel = models.Course || model<CourseType>("Course", courseSchema);

export default CourseModel;

export type { CourseType };
