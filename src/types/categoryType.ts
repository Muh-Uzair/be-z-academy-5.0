import { z } from "zod";
import {
  categoryIdParamsSchema,
  createCategorySchema,
  updateCategorySchema,
  uploadCategoryImageSchema,
  getCategoriesQuerySchema,
} from "@src/validations/categoryValidation";

export type CategoryIdParams = z.infer<typeof categoryIdParamsSchema>;
export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>;
export type UploadCategoryImageBody = z.infer<
  typeof uploadCategoryImageSchema
>;
export type GetCategoriesQuery = z.infer<typeof getCategoriesQuerySchema>;
