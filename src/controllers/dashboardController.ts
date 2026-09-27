import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import { getAdminDashboardService, getInstructorDashboardService, getStudentDashboardService } from "../services/dashboardService";
import { AdminDashboardQuery, InstructorDashboardQuery } from "../types/dashboardType";
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

export const getInstructorDashboard = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.validatedQuery as InstructorDashboardQuery;
    const instructorId = req.user!.id;

    const data = await getInstructorDashboardService(query, instructorId);

    sendResponse(res, 200, {
      status: "success",
      message: "Instructor dashboard data fetched successfully",
      data,
    });
  },
);

export const getStudentDashboard = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const studentId = req.user!.id;

    const data = await getStudentDashboardService({} as never, studentId);

    sendResponse(res, 200, {
      status: "success",
      message: "Student dashboard data fetched successfully",
      data,
    });
  },
);
