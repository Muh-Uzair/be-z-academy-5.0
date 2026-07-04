import { z } from "zod";

export const categoryIdParamsSchema = z.object({
  id: z.string().min(1, { error: "Category id is required" }),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, { error: "Name is required" }),
  imageKey: z.string().trim().min(1, { error: "Image key is required" }),
  description: z.string().trim().min(1, { error: "Description is required" }),
});

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    imageKey: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field must be provided to update the category",
  });

export const uploadCategoryImageSchema = z.object({
  fileName: z.string().trim().min(1, { error: "File name is required" }),
  fileType: z
    .string()
    .trim()
    .refine((val) => val.startsWith("image/"), {
      error: "File type must be an image",
    }),
});

export const getCategoriesQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
});
