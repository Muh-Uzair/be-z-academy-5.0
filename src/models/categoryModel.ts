import { model, models, Schema, type InferSchemaType } from "mongoose";
import { getPublicS3Url } from "@src/services/s3Services";

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    imageKey: {
      type: String,
      required: [true, "Image key is required"],
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    id: false,
  },
);

categorySchema.virtual("imageUrl").get(function () {
  return getPublicS3Url(this.imageKey);
});

categorySchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.imageKey;
    return ret;
  },
});

categorySchema.post("aggregate", function (docs) {
  docs.forEach((doc) => {
    doc.imageUrl = getPublicS3Url(doc.imageKey);
    delete doc.imageKey;
  });
});

type CategoryType = InferSchemaType<typeof categorySchema>;

const CategoryModel =
  models.Category || model<CategoryType>("Category", categorySchema);

export default CategoryModel;

export type { CategoryType };
