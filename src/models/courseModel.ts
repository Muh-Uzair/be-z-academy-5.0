import { model, models, Schema, type InferSchemaType } from "mongoose";
import { getPublicS3Url } from "@src/services/s3Service";
import {
  COURSE_TITLE_MIN_LENGTH,
  COURSE_TITLE_MAX_LENGTH,
  COURSE_DESCRIPTION_MIN_LENGTH,
  COURSE_DESCRIPTION_MAX_LENGTH,
  COURSE_VERIFICATION_REJECTION_REASON_MAX_LENGTH,
  COURSE_AVERAGE_RATING_MIN,
  COURSE_AVERAGE_RATING_MAX,
} from "@src/constants/courseConstant";

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
      minlength: [
        COURSE_TITLE_MIN_LENGTH,
        `Title must be at least ${COURSE_TITLE_MIN_LENGTH} characters`,
      ],
      maxlength: [
        COURSE_TITLE_MAX_LENGTH,
        `Title cannot exceed ${COURSE_TITLE_MAX_LENGTH} characters`,
      ],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [
        COURSE_DESCRIPTION_MIN_LENGTH,
        `Description must be at least ${COURSE_DESCRIPTION_MIN_LENGTH} characters`,
      ],
      maxlength: [
        COURSE_DESCRIPTION_MAX_LENGTH,
        `Description cannot exceed ${COURSE_DESCRIPTION_MAX_LENGTH} characters`,
      ],
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
      maxlength: [
        COURSE_VERIFICATION_REJECTION_REASON_MAX_LENGTH,
        `Rejection reason cannot exceed ${COURSE_VERIFICATION_REJECTION_REASON_MAX_LENGTH} characters`,
      ],
    },

    lastVerificationRejectedAt: {
      type: Date,
      default: null,
    },

    averageRating: {
      type: Number,
      default: 0,
      min: [COURSE_AVERAGE_RATING_MIN, "Average rating cannot be negative"],
      max: [
        COURSE_AVERAGE_RATING_MAX,
        `Average rating cannot exceed ${COURSE_AVERAGE_RATING_MAX}`,
      ],
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
