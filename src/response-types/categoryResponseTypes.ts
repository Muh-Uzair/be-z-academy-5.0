// This file is intentionally framework-independent. Copy it directly into a
// frontend project; it has no backend imports and represents JSON values only.

import { SuccessApiResponse, ApiErrorResponse } from "./authResponseTypes";
import { Pagination } from "./userResponseTypes";

export interface Category {
  _id: string;
  name: string;
  description: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

// API 1: POST /api/v1/categories/upload-image
// Response: { status, message, data: { uploadUrl, fields, key } }
export interface UploadCategoryImageResponseData {
  uploadUrl: string;
  fields: Record<string, string>;
  key: string;
}

export type UploadCategoryImageResponse =
  | SuccessApiResponse<
      UploadCategoryImageResponseData,
      "Category image upload URL generated successfully"
    >
  | ApiErrorResponse;

// API 2: POST /api/v1/categories
// Response: { status, message, data: { category } }
export interface CreateCategoryResponseData {
  category: Category;
}

export type CreateCategoryResponse =
  | SuccessApiResponse<
      CreateCategoryResponseData,
      "Category created successfully"
    >
  | ApiErrorResponse;

// API 3: GET /api/v1/categories
// Response: { status, message, data: { categories, pagination } }
export interface GetCategoriesResponseData {
  categories: Category[];
  pagination: Pagination;
}

export type GetCategoriesResponse =
  | SuccessApiResponse<
      GetCategoriesResponseData,
      "Categories fetched successfully"
    >
  | ApiErrorResponse;

// API 4: GET /api/v1/categories/:id
// Response: { status, message, data: { category } }
export interface GetCategoryDetailsResponseData {
  category: Category;
}

export type GetCategoryDetailsResponse =
  | SuccessApiResponse<
      GetCategoryDetailsResponseData,
      "Category details fetched successfully"
    >
  | ApiErrorResponse;

// API 5: PATCH /api/v1/categories/:id
// Response: { status, message, data: { category } }
export interface UpdateCategoryResponseData {
  category: Category;
}

export type UpdateCategoryResponse =
  | SuccessApiResponse<
      UpdateCategoryResponseData,
      "Category updated successfully"
    >
  | ApiErrorResponse;

// API 6: DELETE /api/v1/categories/:id
// Response: { status, message, data: null }
export type DeleteCategoryResponse =
  | SuccessApiResponse<null, "Category deleted successfully">
  | ApiErrorResponse;
