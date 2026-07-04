import { PipelineStage } from "mongoose";
import { randomUUID } from "crypto";
import CategoryModel from "@src/models/categoryModel";
import CourseModel from "@src/models/courseModel";
import AppError from "@src/utils/appError";
import { getPresignedPutUrlService } from "@src/services/s3Services";
import {
  CreateCategoryBody,
  UpdateCategoryBody,
  UploadCategoryImageBody,
  GetCategoriesQuery,
} from "@src/types/categoryTypes";

export const getCategoryImageUploadUrlService = async (
  body: UploadCategoryImageBody,
): Promise<any> => {
  const key = `5.0/categories/images/${randomUUID()}-${body.fileName}`;

  return getPresignedPutUrlService(key, body.fileType);
};

export const createCategoryService = async (
  body: CreateCategoryBody,
): Promise<any> => {
  const category = await CategoryModel.create(body);

  return category;
};

export const getCategoriesService = async (
  query: GetCategoriesQuery,
): Promise<any> => {
  const pipeline: PipelineStage[] = [];

  if (query.search) {
    pipeline.push({
      $match: {
        name: { $regex: query.search, $options: "i" },
      },
    });
  }

  const countPipeline: PipelineStage[] = [...pipeline, { $count: "total" }];

  pipeline.push({ $sort: { name: 1 } });
  pipeline.push({ $skip: (query.page - 1) * query.limit });
  pipeline.push({ $limit: query.limit });

  const [categories, countResult] = await Promise.all([
    CategoryModel.aggregate(pipeline),
    CategoryModel.aggregate(countPipeline),
  ]);

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
  const category = await CategoryModel.findById(id);

  if (!category) {
    throw new AppError(404, "Category not found");
  }

  return category;
};

export const updateCategoryService = async (
  id: string,
  body: UpdateCategoryBody,
): Promise<any> => {
  const updatedCategory = await CategoryModel.findByIdAndUpdate(id, body, {
    new: true,
    runValidators: true,
  });

  if (!updatedCategory) {
    throw new AppError(404, "Category not found");
  }

  return updatedCategory;
};

export const deleteCategoryService = async (id: string): Promise<any> => {
  const category = await CategoryModel.findById(id);
  if (!category) {
    throw new AppError(404, "Category not found");
  }

  const courseCount = await CourseModel.countDocuments({ category: id });
  if (courseCount > 0) {
    throw new AppError(
      400,
      "Cannot delete a category that has courses assigned to it",
    );
  }

  await category.deleteOne();

  return null;
};
