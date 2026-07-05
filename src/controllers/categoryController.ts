import { Request, Response } from "express";
import catchAsync from "@src/utils/catchAsync";
import {
  createCategoryService,
  getCategoriesService,
  getCategoryByIdService,
  updateCategoryService,
  deleteCategoryService,
  getCategoryImageUploadUrlService,
} from "@src/services/categoryServices";
import {
  CategoryIdParams,
  CreateCategoryBody,
  UpdateCategoryBody,
  UploadCategoryImageBody,
  GetCategoriesQuery,
} from "@src/types/categoryTypes";
import sendResponse from "@src/utils/sendResponse";

export const uploadCategoryImage = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as UploadCategoryImageBody;

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
    const body = req.body as CreateCategoryBody;

    const category = await createCategoryService(body);

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

    const { categories, pagination } = await getCategoriesService(query);

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

    const category = await getCategoryByIdService(id);

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
    const body = req.body as UpdateCategoryBody;

    const category = await updateCategoryService(id, body);

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

    sendResponse(res, 200, {
      status: "success",
      message: "Category deleted successfully",
      data: null,
    });
  },
);
