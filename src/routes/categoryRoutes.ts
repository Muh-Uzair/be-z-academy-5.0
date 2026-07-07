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
import protectMiddleware from "@src/middlewares/protectMiddleware";
import restrictToMiddleware from "@src/middlewares/restrictToMiddleware";
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
  protectMiddleware,
  restrictToMiddleware(Role.Admin),
  validationMiddleware(uploadCategoryImageSchema, "body"),
  uploadCategoryImage,
);

categoryRouter.post(
  "/",
  protectMiddleware,
  restrictToMiddleware(Role.Admin),
  validationMiddleware(createCategorySchema, "body"),
  createCategory,
);

categoryRouter.get(
  "/",
  protectMiddleware,
  validationMiddleware(getCategoriesQuerySchema, "query"),
  getCategories,
);

categoryRouter.get(
  "/:id",
  protectMiddleware,
  validationMiddleware(categoryIdParamsSchema, "params"),
  getCategoryDetails,
);

categoryRouter.patch(
  "/:id",
  protectMiddleware,
  restrictToMiddleware(Role.Admin),
  validationMiddleware(categoryIdParamsSchema, "params"),
  validationMiddleware(updateCategorySchema, "body"),
  updateCategory,
);

categoryRouter.delete(
  "/:id",
  protectMiddleware,
  restrictToMiddleware(Role.Admin),
  validationMiddleware(categoryIdParamsSchema, "params"),
  deleteCategory,
);

export default categoryRouter;
