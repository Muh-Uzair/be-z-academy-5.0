import { Request, Response } from "express";
import catchAsync from "@src/utils/catchAsync";
import {
  getInstructorsService,
  getUserDetailsService,
  updateUserVerificationService,
  updateOwnProfileService,
} from "@src/services/userService";
import { getInstructorOnboardingLinkService } from "@src/services/stripeService";
import {
  GetInstructorsQuery,
  UserIdParams,
  UpdateUserVerificationBody,
  UpdateProfileBody,
  UserRoleQuery,
} from "@src/types/userType";
import sendResponse from "@src/utils/sendResponse";
import { getCache, setCache, deleteCache, deleteCacheByPattern } from "@src/utils/cache";

export const getInstructors = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.validatedQuery as GetInstructorsQuery;

    const cacheKey = `instructors:${JSON.stringify(query)}`;

    const cached = await getCache<{ instructors: unknown; pagination: unknown }>(cacheKey);

    if (cached) {
      sendResponse(res, 200, {
        status: "success",
        message: "Instructors fetched successfully",
        data: cached,
      });
      return;
    }

    const { instructors, pagination } = await getInstructorsService(query);

    await setCache(cacheKey, { instructors, pagination });

    sendResponse(res, 200, {
      status: "success",
      message: "Instructors fetched successfully",
      data: { instructors, pagination },
    });
  },
);

export const getUserDetails = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as UserIdParams;
    const { role } = req.validatedQuery as UserRoleQuery;

    const cacheKey = `userDetails:${id}`;

    const cachedUser = await getCache<unknown>(cacheKey);

    if (cachedUser) {
      sendResponse(res, 200, {
        status: "success",
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} details fetched successfully`,
        data: { user: cachedUser },
      });
      return;
    }

    const user = await getUserDetailsService(id, role);

    await setCache(cacheKey, user);

    sendResponse(res, 200, {
      status: "success",
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} details fetched successfully`,
      data: { user },
    });
  },
);

export const getInstructorOnboardingLink = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const instructorId = req.user!.id;

    const data = await getInstructorOnboardingLinkService(instructorId);

    sendResponse(res, 200, {
      status: "success",
      message: "Stripe onboarding link generated successfully",
      data,
    });
  },
);

export const updateProfile = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id, role } = req.user!;
    const body = req.validatedBody as UpdateProfileBody;

    const user = await updateOwnProfileService(id, role, body);

    await deleteCache(`userDetails:${id}`);
    if (role === "instructor") {
      await deleteCacheByPattern("instructors:*");
    }

    sendResponse(res, 200, {
      status: "success",
      message: "Profile updated successfully",
      data: { user },
    });
  },
);

export const updateUserVerification = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as UserIdParams;
    const { role } = req.validatedQuery as UserRoleQuery;
    const body = req.validatedBody as UpdateUserVerificationBody;

    const user = await updateUserVerificationService(
      id,
      role,
      body,
    );

    await deleteCache(`userDetails:${id}`);
    if (role === "instructor") {
      await deleteCacheByPattern("instructors:*");
    }

    sendResponse(res, 200, {
      status: "success",
      message: body.isVerified
        ? `${role.charAt(0).toUpperCase() + role.slice(1)} approved successfully`
        : `${role.charAt(0).toUpperCase() + role.slice(1)} rejected successfully`,
      data: { user },
    });
  },
);
