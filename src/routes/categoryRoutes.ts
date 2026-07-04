import { Router } from "express";
import {
  createCategory,
  getCategories,
  getCategoryDetails,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
} from "@src/controllers/categoryController";
import validationMiddleware from "@src/middlewares/validationMiddleware";
import protect from "@src/middlewares/protectMiddleware";
import restrictTo from "@src/middlewares/restrictToMiddleware";
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
  validationMiddleware(uploadCategoryImageSchema, "body"),
  uploadCategoryImage,
);

categoryRouter.post(
  "/",
  protect,
  restrictTo(Role.Admin),
  validationMiddleware(createCategorySchema, "body"),
  createCategory,
);

categoryRouter.get(
  "/",
  protect,
  validationMiddleware(getCategoriesQuerySchema, "query"),
  getCategories,
);

categoryRouter.get(
  "/:id",
  protect,
  validationMiddleware(categoryIdParamsSchema, "params"),
  getCategoryDetails,
);

categoryRouter.patch(
  "/:id",
  protect,
  restrictTo(Role.Admin),
  validationMiddleware(categoryIdParamsSchema, "params"),
  validationMiddleware(updateCategorySchema, "body"),
  updateCategory,
);

categoryRouter.delete(
  "/:id",
  protect,
  restrictTo(Role.Admin),
  validationMiddleware(categoryIdParamsSchema, "params"),
  deleteCategory,
);

export default categoryRouter;
