import { PipelineStage } from "mongoose";
import { randomUUID } from "crypto";
import CategoryModel from "@src/models/categoryModel";
import CourseModel from "@src/models/courseModel";
import AppError from "@src/utils/appError";
import {
  getPresignedPostUrlService,
  deleteS3ObjectService,
  buildS3ObjectKey,
} from "@src/services/s3Services";
import {
  CreateCategoryBody,
  UpdateCategoryBody,
  UploadCategoryImageBody,
  GetCategoriesQuery,
} from "@src/types/categoryTypes";

const MAX_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024; // 5MB

export const getCategoryImageUploadUrlService = async (
  body: UploadCategoryImageBody,
): Promise<any> => {
  // Step 1: Build a unique S3 key for the image, with the correct extension
  const key = buildS3ObjectKey(
    "5.0/categories/images",
    body.fileName,
    body.fileType,
    randomUUID(),
  );

  // Step 2: Generate a presigned POST policy capped at the max image size
  return getPresignedPostUrlService(key, body.fileType, MAX_IMAGE_SIZE_IN_BYTES);
};

export const createCategoryService = async (
  body: CreateCategoryBody,
): Promise<any> => {
  // Step 1: Create the category document
  const category = await CategoryModel.create(body);

  return category;
};

export const getCategoriesService = async (
  query: GetCategoriesQuery,
): Promise<any> => {
  // Step 1: Build the base pipeline with an optional search filter
  const pipeline: PipelineStage[] = [];

  if (query.search) {
    pipeline.push({
      $match: {
        name: { $regex: query.search, $options: "i" },
      },
    });
  }

  // Step 2: Clone the pipeline for a total count before pagination is applied
  const countPipeline: PipelineStage[] = [...pipeline, { $count: "total" }];

  // Step 3: Apply sorting and pagination to the main pipeline
  pipeline.push({ $sort: { name: 1 } });
  pipeline.push({ $skip: (query.page - 1) * query.limit });
  pipeline.push({ $limit: query.limit });

  // Step 4: Run both pipelines in parallel
  const [categories, countResult] = await Promise.all([
    CategoryModel.aggregate(pipeline),
    CategoryModel.aggregate(countPipeline),
  ]);

  // Step 5: Compute pagination metadata
  const totalDocuments = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(totalDocuments / query.limit);

  return {
    categories,
    pagination: {
      page: query.page,
      limit: query.limit,
      totalDocuments,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPrevPage: query.page > 1,
    },
  };
};

export const getCategoryByIdService = async (id: string): Promise<any> => {
  // Step 1: Find the category by id
  const category = await CategoryModel.findById(id);

  // Step 2: Ensure it exists
  if (!category) {
    throw new AppError(404, "Category not found");
  }

  return category;
};

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
