import { model, models, Schema, type InferSchemaType } from "mongoose";
import {
  ENROLLMENT_WATCH_PERCENTAGE_MIN,
  ENROLLMENT_WATCH_PERCENTAGE_MAX,
} from "../constants/enrollmentConstant";

const enrollmentSchema = new Schema(
  {
    student: {
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

    transaction: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
    },

    enrolledAt: {
      type: Date,
      default: Date.now,
    },

    totalDurationWatchedInMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    watchPercentage: {
      type: Number,
      default: 0,
      min: ENROLLMENT_WATCH_PERCENTAGE_MIN,
      max: ENROLLMENT_WATCH_PERCENTAGE_MAX,
    },

    watchedCompletely: {
      type: Boolean,
      default: false,
    },

    watchedCompletelyAt: {
      type: Date,
      default: null,
    },

    mostRecentlySeen: {
      type: Boolean,
      default: false,
    },

    certificateIssued: {
      type: Boolean,
      default: false,
    },

    certificateIssuedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    id: false,
  },
);

// Indexes to support APIFeatures role-scoping, query filtering, and default sorting.
enrollmentSchema.index({ student: 1 });
enrollmentSchema.index({ course: 1 });
enrollmentSchema.index({ instructor: 1 });
enrollmentSchema.index({ transaction: 1 });
enrollmentSchema.index({ createdAt: -1 });

type EnrollmentType = InferSchemaType<typeof enrollmentSchema>;

const EnrollmentModel =
  models.Enrollment || model<EnrollmentType>("Enrollment", enrollmentSchema);

export default EnrollmentModel;

export type { EnrollmentType };
