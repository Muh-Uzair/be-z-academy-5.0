import { Router } from "express";
import {
  createCategory,
  getCategories,
  getCategoryDetails,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
} from "@src/controllers/categoryController";
import validation from "@src/middlewares/validation";
import protect from "@src/middlewares/protect";
import restrictTo from "@src/middlewares/restrictTo";
import { Role } from "@src/models/userModel";
import {
  categoryIdParamsSchema,
  createCategorySchema,
  updateCategorySchema,
  uploadCategoryImageSchema,
  getCategoriesQuerySchema,
} from "@src/validations/categoryValidations";

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
  protect,
  validation(getCategoriesQuerySchema, "query"),
  getCategories,
);

categoryRouter.get(
  "/:id",
  protect,
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
