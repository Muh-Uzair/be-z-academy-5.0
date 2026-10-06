import { Router } from "express";
import protect from "../middlewares/protect";
import restrictTo from "../middlewares/restrictTo";
import validation from "../middlewares/validation";
import { Role } from "../models/userModel";
import { dashboardQuerySchema } from "../validations/dashboardValidation";
import {
  getAdminDashboard,
  getInstructorDashboard,
  getStudentDashboard,
} from "../controllers/dashboardController";

const dashboardRouter = Router();

dashboardRouter.get(
  "/admin",
  protect,
  restrictTo(Role.Admin),
  validation(dashboardQuerySchema, "query"),
  getAdminDashboard,
);

dashboardRouter.get(
  "/instructor",
  protect,
  restrictTo(Role.Instructor),
  validation(dashboardQuerySchema, "query"),
  getInstructorDashboard,
);

dashboardRouter.get(
  "/student",
  protect,
  restrictTo(Role.Student),
  validation(dashboardQuerySchema, "query"),
  getStudentDashboard,
);

export default dashboardRouter;
