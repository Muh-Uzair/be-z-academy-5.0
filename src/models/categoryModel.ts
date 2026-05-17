import { model, models, Schema, type InferSchemaType } from "mongoose";

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    image: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
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
