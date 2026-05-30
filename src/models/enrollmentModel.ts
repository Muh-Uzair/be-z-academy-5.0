import { model, models, Schema, type InferSchemaType } from "mongoose";

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
      min: 0,
      max: 100,
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
  },
);

type EnrollmentType = InferSchemaType<typeof enrollmentSchema>;

const EnrollmentModel =
  models.Enrollment || model<EnrollmentType>("Enrollment", enrollmentSchema);

export default EnrollmentModel;

export type { EnrollmentType };
