import { model, models, Schema, type InferSchemaType } from "mongoose";

const transactionSchema = new Schema(
  {
    transactionId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
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
      enum: ["pending", "paid", "failed"],
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
  },
);

type TransactionType = InferSchemaType<typeof transactionSchema>;

const TransactionModel =
  models.Transaction ||
  model<TransactionType>("Transaction", transactionSchema);

export default TransactionModel;

export type { TransactionType };
