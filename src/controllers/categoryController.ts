import { Request, Response } from "express";
import catchAsync from "@src/utils/catchAsync";
import {
  createCategoryService,
  getCategoriesService,
  getCategoryDetailsService,
  updateCategoryService,
  deleteCategoryService,
  getCategoryImageUploadUrlService,
} from "@src/services/categoryService";
import {
  CategoryIdParams,
  CreateCategoryBody,
  UpdateCategoryBody,
  UploadCategoryImageBody,
  GetCategoriesQuery,
} from "@src/types/categoryType";
import sendResponse from "@src/utils/sendResponse";
import {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
} from "@src/utils/cache";

export const uploadCategoryImage = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.validatedBody as UploadCategoryImageBody;

    const { uploadUrl, fields, key } =
      await getCategoryImageUploadUrlService(body);

    sendResponse(res, 200, {
      status: "success",
      message: "Category image upload URL generated successfully",
      data: { uploadUrl, fields, key },
    });
  },
);

export const createCategory = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.validatedBody as CreateCategoryBody;

    const category = await createCategoryService(body);

    await deleteCacheByPattern("categories:*");

    sendResponse(res, 201, {
      status: "success",
      message: "Category created successfully",
      data: { category },
    });
  },
);

export const getCategories = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.validatedQuery as GetCategoriesQuery;

    const cacheKey = `categories:${JSON.stringify(query)}`;

    const cached = await getCache<{ categories: unknown; pagination: unknown }>(
      cacheKey,
    );

    if (cached) {
      sendResponse(res, 200, {
        status: "success",
        message: "Categories fetched successfully",
        data: cached,
      });
      return;
    }

    const { categories, pagination } = await getCategoriesService(query);

    await setCache(cacheKey, { categories, pagination });

    sendResponse(res, 200, {
      status: "success",
      message: "Categories fetched successfully",
      data: { categories, pagination },
    });
  },
);

export const getCategoryDetails = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as CategoryIdParams;

    const cacheKey = `categoriesDetails:${id}`;

    const cachedCategory = await getCache<unknown>(cacheKey);

    if (cachedCategory) {
      sendResponse(res, 200, {
        status: "success",
        message: "Category details fetched successfully",
        data: { category: cachedCategory },
      });
      return;
    }

    const category = await getCategoryDetailsService(id);

    await setCache(cacheKey, category);

    sendResponse(res, 200, {
      status: "success",
      message: "Category details fetched successfully",
      data: { category },
    });
  },
);

export const updateCategory = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as CategoryIdParams;
    const body = req.validatedBody as UpdateCategoryBody;

    const category = await updateCategoryService(id, body);

    await deleteCacheByPattern("categories:*");
    await deleteCache(`categoriesDetails:${id}`);

    sendResponse(res, 200, {
      status: "success",
      message: "Category updated successfully",
      data: { category },
    });
  },
);

export const deleteCategory = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as CategoryIdParams;

    await deleteCategoryService(id);

    await deleteCacheByPattern("categories:*");
    await deleteCache(`categoriesDetails:${id}`);

    sendResponse(res, 200, {
      status: "success",
      message: "Category deleted successfully",
      data: null,
    });
  },
);
