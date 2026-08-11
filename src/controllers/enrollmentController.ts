import { Request, Response } from "express";
import catchAsync from "@src/utils/catchAsync";
import {
  getEnrollmentsService,
  getEnrollmentDetailsService,
} from "@src/services/enrollmentService";
import {
  GetEnrollmentsQuery,
  EnrollmentIdParams,
} from "@src/types/enrollmentType";
import sendResponse from "@src/utils/sendResponse";
import { getCache, setCache } from "@src/utils/cache";

export const getEnrollments = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.validatedQuery as GetEnrollmentsQuery;
    const { id, role } = req.user!;

    const cacheKey = `enrollments:${JSON.stringify(query)}:${role}:${id}`;

    const cached = await getCache<{ enrollments: unknown; pagination: unknown }>(
      cacheKey,
    );

    if (cached) {
      sendResponse(res, 200, {
        status: "success",
        message: "Enrollments fetched successfully",
        data: cached,
      });
      return;
    }

    const { enrollments, pagination } = await getEnrollmentsService(query, {
      id,
      role,
    });

    await setCache(cacheKey, { enrollments, pagination });

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

    const cacheKey = `enrollmentDetails:${id}:${role}:${userId}`;

    const cachedEnrollment = await getCache<unknown>(cacheKey);

    if (cachedEnrollment) {
      sendResponse(res, 200, {
        status: "success",
        message: "Enrollment details fetched successfully",
        data: { enrollment: cachedEnrollment },
      });
      return;
    }

    const enrollment = await getEnrollmentDetailsService(id, {
      id: userId,
      role,
    });

    await setCache(cacheKey, enrollment);

    sendResponse(res, 200, {
      status: "success",
      message: "Enrollment details fetched successfully",
      data: { enrollment },
    });
  },
);
