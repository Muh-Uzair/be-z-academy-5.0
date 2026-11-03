import { Router } from "express";
import {
  createCategory,
  getCategories,
  getTopCategories,
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

// DIVIDER Admin Routes ---------------------------------------------------------

// (root)/api/v1/categories/upload-image
categoryRouter.post(
  "/upload-image",
  protect,
  restrictTo(Role.Admin),
  validation(uploadCategoryImageSchema, "body"),
  uploadCategoryImage,
);

// (root)/api/v1/categories
categoryRouter.post(
  "/",
  protect,
  restrictTo(Role.Admin),
  validation(createCategorySchema, "body"),
  createCategory,
);

// (root)/api/v1/categories/:id
categoryRouter.patch(
  "/:id",
  protect,
  restrictTo(Role.Admin),
  validation(categoryIdParamsSchema, "params"),
  validation(updateCategorySchema, "body"),
  updateCategory,
);

// (root)/api/v1/categories/:id
categoryRouter.delete(
  "/:id",
  protect,
  restrictTo(Role.Admin),
  validation(categoryIdParamsSchema, "params"),
  deleteCategory,
);

// DIVIDER Instructor Routes ---------------------------------------------------------

// DIVIDER Student Routes ---------------------------------------------------------

// DIVIDER Admin + Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Admin + Instructor Routes ---------------------------------------------------------

// DIVIDER Admin + Student Routes ---------------------------------------------------------

// DIVIDER Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Public Routes ---------------------------------------------------------

// (root)/api/v1/categories
categoryRouter.get(
  "/",
  validation(getCategoriesQuerySchema, "query"),
  getCategories,
);

// (root)/api/v1/categories/top
categoryRouter.get("/top", getTopCategories);

// (root)/api/v1/categories/:id
categoryRouter.get(
  "/:id",
  validation(categoryIdParamsSchema, "params"),
  getCategoryDetails,
);

export default categoryRouter;
