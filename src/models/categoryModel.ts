import { model, models, Schema, type InferSchemaType } from "mongoose";
import { getPublicS3Url } from "../services/s3Service";
import {
  CATEGORY_NAME_MIN_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_DESCRIPTION_MIN_LENGTH,
  CATEGORY_DESCRIPTION_MAX_LENGTH,
} from "../constants/categoryConstant";

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      unique: true,
      trim: true,
      minlength: [
        CATEGORY_NAME_MIN_LENGTH,
        `Name must be at least ${CATEGORY_NAME_MIN_LENGTH} characters`,
      ],
      maxlength: [
        CATEGORY_NAME_MAX_LENGTH,
        `Name cannot exceed ${CATEGORY_NAME_MAX_LENGTH} characters`,
      ],
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
      minlength: [
        CATEGORY_DESCRIPTION_MIN_LENGTH,
        `Description must be at least ${CATEGORY_DESCRIPTION_MIN_LENGTH} characters`,
      ],
      maxlength: [
        CATEGORY_DESCRIPTION_MAX_LENGTH,
        `Description cannot exceed ${CATEGORY_DESCRIPTION_MAX_LENGTH} characters`,
      ],
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

// Index to support APIFeatures default sorting
categorySchema.index({ createdAt: -1 });

type CategoryType = InferSchemaType<typeof categorySchema>;

const CategoryModel =
  models.Category || model<CategoryType>("Category", categorySchema);

export default CategoryModel;

export type { CategoryType };
