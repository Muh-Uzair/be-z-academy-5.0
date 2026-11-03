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

// DIVIDER Admin Routes ---------------------------------------------------------

// (root)/api/v1/dashboard/admin
dashboardRouter.get(
  "/admin",
  protect,
  restrictTo(Role.Admin),
  validation(dashboardQuerySchema, "query"),
  getAdminDashboard,
);

// DIVIDER Instructor Routes ---------------------------------------------------------

// (root)/api/v1/dashboard/instructor
dashboardRouter.get(
  "/instructor",
  protect,
  restrictTo(Role.Instructor),
  validation(dashboardQuerySchema, "query"),
  getInstructorDashboard,
);

// DIVIDER Student Routes ---------------------------------------------------------

// (root)/api/v1/dashboard/student
dashboardRouter.get(
  "/student",
  protect,
  restrictTo(Role.Student),
  getStudentDashboard,
);

// DIVIDER Admin + Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Admin + Instructor Routes ---------------------------------------------------------

// DIVIDER Admin + Student Routes ---------------------------------------------------------

// DIVIDER Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Public Routes ---------------------------------------------------------

export default dashboardRouter;
