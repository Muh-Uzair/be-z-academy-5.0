import { randomUUID } from "crypto";
import CategoryModel from "@src/models/categoryModel";
import CourseModel from "@src/models/courseModel";
import AppError from "@src/utils/appError";
import APIFeatures from "@src/utils/apiFeatures";
import {
  getPresignedPostUrlService,
  deleteS3ObjectService,
  buildS3ObjectKey,
} from "@src/services/s3Service";
import {
  CreateCategoryBody,
  UpdateCategoryBody,
  UploadCategoryImageBody,
  GetCategoriesQuery,
} from "@src/types/categoryType";
import {
  CATEGORY_MAX_IMAGE_SIZE_IN_BYTES,
  CATEGORY_IMAGE_S3_FOLDER,
} from "@src/constants/categoryConstant";

// FUNCTION
export const getCategoryImageUploadUrlService = async (
  body: UploadCategoryImageBody,
): Promise<any> => {
  // Step 1: Build a unique S3 key for the image, with the correct extension
  const key = buildS3ObjectKey(
    CATEGORY_IMAGE_S3_FOLDER,
    body.fileName,
    body.fileType,
    randomUUID(),
  );

  // Step 2: Generate a presigned POST policy capped at the max image size
  return getPresignedPostUrlService(
    key,
    body.fileType,
    CATEGORY_MAX_IMAGE_SIZE_IN_BYTES,
  );
};

// FUNCTION
export const createCategoryService = async (
  body: CreateCategoryBody,
): Promise<any> => {
  // Step 1: Create the category document
  const category = await CategoryModel.create(body);

  return category;
};

// FUNCTION
export const getCategoriesService = async (
  query: GetCategoriesQuery,
): Promise<any> => {
  // Step 1: Start with an empty base pipeline (no resource-specific pre-filters needed)
  const { data: categories, pagination } = await new APIFeatures(
    CategoryModel,
    query,
    [],
  )
    .search(["name"])
    .sort()
    .projection()
    .paginate()
    .exec();

  return { categories, pagination };
};

// FUNCTION
export const getCategoryByIdService = async (id: string): Promise<any> => {
  // Step 1: Find the category by id
  const category = await CategoryModel.findById(id);

  // Step 2: Ensure it exists
  if (!category) {
    throw new AppError(404, "Category not found");
  }

  return category;
};

// FUNCTION
export const updateCategoryService = async (
  id: string,
  body: UpdateCategoryBody,
): Promise<any> => {
  // Step 1: Fetch the existing category to capture its current image key
  const existingCategory = await CategoryModel.findById(id);

  if (!existingCategory) {
    throw new AppError(404, "Category not found");
  }

  const previousImageKey = existingCategory.imageKey;

  // Step 2: Apply the update
  const updatedCategory = await CategoryModel.findByIdAndUpdate(id, body, {
    new: true,
    runValidators: true,
  });

  // Step 3: If the image was replaced, delete the old S3 object
  if (body.imageKey && body.imageKey !== previousImageKey) {
    await deleteS3ObjectService(previousImageKey);
  }

  return updatedCategory;
};

// FUNCTION
export const deleteCategoryService = async (id: string): Promise<any> => {
  // Step 1: Ensure the category exists
  const category = await CategoryModel.findById(id);
  if (!category) {
    throw new AppError(404, "Category not found");
  }

  // Step 2: Prevent deletion if courses are still assigned to this category
  const courseCount = await CourseModel.countDocuments({ category: id });
  if (courseCount > 0) {
    throw new AppError(
      400,
      "Cannot delete a category that has courses assigned to it",
    );
  }

  // Step 3: Delete the category document
  await category.deleteOne();

  // Step 4: Delete the now-orphaned image from S3
  await deleteS3ObjectService(category.imageKey);

  return null;
};
