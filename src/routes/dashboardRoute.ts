import { Router } from "express";
import { getAdminDashboard } from "../controllers/dashboardController";
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

export default dashboardRouter;
