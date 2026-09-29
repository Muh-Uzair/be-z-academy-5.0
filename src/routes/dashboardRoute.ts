import { Router } from "express";
import { getAdminDashboard, getInstructorDashboard, getStudentDashboard } from "../controllers/dashboardController";
import protect from "../middlewares/protect";
import restrictTo from "../middlewares/restrictTo";
import validation from "../middlewares/validation";
import { Role } from "../models/userModel";
import {
  adminDashboardQuerySchema,
  studentDashboardQuerySchema,
} from "../validations/dashboardValidation";

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

dashboardRouter.get(
  "/student",
  protect,
  restrictTo(Role.Student),
  validation(studentDashboardQuerySchema, "query"),
  getStudentDashboard,
);

export default dashboardRouter;
