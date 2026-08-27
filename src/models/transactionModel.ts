import { env } from "../config/env";
import { model, models, Schema, type InferSchemaType } from "mongoose";

const transactionSchema = new Schema(
  {
    transactionId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    stripeChargeId: {
      type: String,
      default: null,
    },

    currency: {
      type: String,
      default: "usd",
    },

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

    totalPrice: {
      type: Number,
      required: true,
    },

    amountPaid: {
      type: Number,
      required: true,
    },

    amountPaidAt: {
      type: Date,
      default: null,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    adminCommissionPercentage: {
      type: Number,
      default: env.PLATFORM_COMMISSION_PERCENTAGE,
    },

    adminCommission: {
      type: Number,
      required: true,
    },

    instructorRevenue: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    id: false,
  },
);

// Indexes to support APIFeatures role-scoping and query filtering,
// dramatically speeding up list queries.
transactionSchema.index({ instructor: 1 });
transactionSchema.index({ student: 1 });
transactionSchema.index({ createdAt: -1 });

type TransactionType = InferSchemaType<typeof transactionSchema>;

const TransactionModel =
  models.Transaction ||
  model<TransactionType>("Transaction", transactionSchema);

export default TransactionModel;

export type { TransactionType };
