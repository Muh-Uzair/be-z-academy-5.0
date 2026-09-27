import { Router } from "express";
import { getAdminDashboard, getInstructorDashboard } from "../controllers/dashboardController";
import protect from "../middlewares/protect";
import restrictTo from "../middlewares/restrictTo";
import validation from "../middlewares/validation";
import { Role } from "../models/userModel";
import { adminDashboardQuerySchema } from "../validations/dashboardValidation";

const dashboardRouter = Router();

dashboardRouter.get(
  "/admin",
  protect,
  restrictTo(Role.Admin),
  validation(adminDashboardQuerySchema, "query"),
  getAdminDashboard,
);

dashboardRouter.get(
  "/instructor",
  protect,
  restrictTo(Role.Instructor),
  validation(adminDashboardQuerySchema, "query"),
  getInstructorDashboard,
);

export default dashboardRouter;
