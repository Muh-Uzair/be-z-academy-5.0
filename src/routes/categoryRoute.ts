import { Router } from "express";
import {
  createCategory,
  getCategories,
  getCategoryDetails,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
} from "../controllers/categoryController";
import validation from "../middlewares/validation";
import protect from "../middlewares/protect";
import restrictTo from "../middlewares/restrictTo";
import { Role } from "../models/userModel";
import {
  categoryIdParamsSchema,
  createCategorySchema,
  updateCategorySchema,
  uploadCategoryImageSchema,
  getCategoriesQuerySchema,
} from "../validations/categoryValidation";

const categoryRouter = Router();

categoryRouter.post(
  "/upload-image",
  protect,
  restrictTo(Role.Admin),
  validation(uploadCategoryImageSchema, "body"),
  uploadCategoryImage,
);

categoryRouter.post(
  "/",
  protect,
  restrictTo(Role.Admin),
  validation(createCategorySchema, "body"),
  createCategory,
);

categoryRouter.get(
  "/",
  validation(getCategoriesQuerySchema, "query"),
  getCategories,
);

categoryRouter.get(
  "/:id",
  validation(categoryIdParamsSchema, "params"),
  getCategoryDetails,
);

categoryRouter.patch(
  "/:id",
  protect,
  restrictTo(Role.Admin),
  validation(categoryIdParamsSchema, "params"),
  validation(updateCategorySchema, "body"),
  updateCategory,
);

categoryRouter.delete(
  "/:id",
  protect,
  restrictTo(Role.Admin),
  validation(categoryIdParamsSchema, "params"),
  deleteCategory,
);

export default categoryRouter;
