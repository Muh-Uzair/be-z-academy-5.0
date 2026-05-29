import { model, models, Schema, type InferSchemaType } from "mongoose";

const categorySchema = new Schema(
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

    totalPrice: {
      type: Number,
      required: true,
    },

    amountPaid: {
      type: Number,
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "paid",
    },

    platformCommission: {
      type: Number,
      required: true,
    },

    instructorRevenue: {
      type: Number,
      required: true,
    },

    enrolledAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

type CategoryType = InferSchemaType<typeof categorySchema>;

const CategoryModel =
  models.Category || model<CategoryType>("Category", categorySchema);

export default CategoryModel;

export type { CategoryType };
