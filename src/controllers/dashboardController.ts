import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import { getAdminDashboardService } from "../services/dashboardService";
import { AdminDashboardQuery } from "../types/dashboardType";
import sendResponse from "../utils/sendResponse";

export const getAdminDashboard = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.validatedQuery as AdminDashboardQuery;

    const data = await getAdminDashboardService(query);

    sendResponse(res, 200, {
      status: "success",
      message: "Admin dashboard data fetched successfully",
      data,
    });
  },
);
