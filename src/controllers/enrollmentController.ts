import { Request, Response } from "express";
import catchAsync from "@src/utils/catchAsync";
import {
  getEnrollmentsService,
  getEnrollmentByIdService,
} from "@src/services/enrollmentServices";
import {
  GetEnrollmentsQuery,
  EnrollmentIdParams,
} from "@src/types/enrollmentTypes";
import sendResponse from "@src/utils/sendResponse";

export const getEnrollments = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.validatedQuery as GetEnrollmentsQuery;
    const { id, role } = req.user!;

    const { enrollments, pagination } = await getEnrollmentsService(query, {
      id,
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

    const enrollment = await getEnrollmentByIdService(id, {
      id: userId,
      role,
    });

    sendResponse(res, 200, {
      status: "success",
      message: "Enrollment details fetched successfully",
      data: { enrollment },
    });
  },
);
