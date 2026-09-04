import { z } from "zod";
import {
  CATEGORY_NAME_MIN_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_DESCRIPTION_MIN_LENGTH,
  CATEGORY_DESCRIPTION_MAX_LENGTH,
} from "../constants/categoryConstant";

export const categoryIdParamsSchema = z
  .object({
    id: z.string().min(1, { error: "Category id is required" }),
  })
  .strict();

export const createCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(CATEGORY_NAME_MIN_LENGTH, {
        error: `Name must be at least ${CATEGORY_NAME_MIN_LENGTH} characters`,
      })
      .max(CATEGORY_NAME_MAX_LENGTH, {
        error: `Name cannot exceed ${CATEGORY_NAME_MAX_LENGTH} characters`,
      }),
    imageKey: z.string().trim().min(1, { error: "Image key is required" }),
    description: z
      .string()
      .trim()
      .min(CATEGORY_DESCRIPTION_MIN_LENGTH, {
        error: `Description must be at least ${CATEGORY_DESCRIPTION_MIN_LENGTH} characters`,
      })
      .max(CATEGORY_DESCRIPTION_MAX_LENGTH, {
        error: `Description cannot exceed ${CATEGORY_DESCRIPTION_MAX_LENGTH} characters`,
      }),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(CATEGORY_NAME_MIN_LENGTH)
      .max(CATEGORY_NAME_MAX_LENGTH)
      .optional(),
    imageKey: z.string().trim().min(1).optional(),
    description: z
      .string()
      .trim()
      .min(CATEGORY_DESCRIPTION_MIN_LENGTH)
      .max(CATEGORY_DESCRIPTION_MAX_LENGTH)
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field must be provided to update the category",
  });

const ALLOWED_IMAGE_FILE_TYPES = ["image/jpeg", "image/png"] as const;

export const uploadCategoryImageSchema = z
  .object({
    fileName: z.string().trim().min(1, { error: "File name is required" }),
    fileType: z.enum(ALLOWED_IMAGE_FILE_TYPES, {
      error: "Image must be a JPEG or PNG file",
    }),
  })
  .strict();

export const getCategoriesQuerySchema = z
  .object({
    search: z.string().trim().min(1).optional(),
    projection: z.string().trim().min(1).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).default(10),
    sortBy: z.string().trim().min(1).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

