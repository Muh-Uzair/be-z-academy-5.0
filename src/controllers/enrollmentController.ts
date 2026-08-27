import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import {
  getEnrollmentsService,
  getEnrollmentDetailsService,
} from "../services/enrollmentService";
import {
  GetEnrollmentsQuery,
  EnrollmentIdParams,
} from "../types/enrollmentType";
import sendResponse from "../utils/sendResponse";

export const getEnrollments = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.validatedQuery as GetEnrollmentsQuery;
    const { id: userId, role } = req.user!;

    const { enrollments, pagination } = await getEnrollmentsService(query, {
      userId,
      role,
    });

    sendResponse(res, 200, {
      status: "success",
      message: "Enrollments fetched successfully",
      data: { enrollments, pagination },
    });
  },
);

export const getEnrollmentDetails = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as EnrollmentIdParams;
    const { id: userId, role } = req.user!;

    const enrollment = await getEnrollmentDetailsService(id, {
      userId,
      role,
    });

    sendResponse(res, 200, {
      status: "success",
      message: "Enrollment details fetched successfully",
      data: { enrollment },
    });
  },
);
