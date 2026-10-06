import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { DashboardQuery } from "../types/dashboardType";
import {
  getAdminDashboardService,
  getInstructorDashboardService,
  getStudentDashboardService,
} from "../services/dashboardService";

export const getAdminDashboard = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    const { period } = req.validatedQuery as DashboardQuery;

    const data = await getAdminDashboardService(user, period);

    sendResponse(res, 200, {
      status: "success",
      message: "Admin dashboard fetched successfully",
      data,
    });
  },
);

export const getInstructorDashboard = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    const { period } = req.validatedQuery as DashboardQuery;

    const data = await getInstructorDashboardService(user, period);

    sendResponse(res, 200, {
      status: "success",
      message: "Instructor dashboard fetched successfully",
      data,
    });
  },
);

export const getStudentDashboard = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user;
    const { period } = req.validatedQuery as DashboardQuery;

    const data = await getStudentDashboardService(user, period);

    sendResponse(res, 200, {
      status: "success",
      message: "Student dashboard fetched successfully",
      data,
    });
  },
);
