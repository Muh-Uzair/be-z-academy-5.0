import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import {
  getInstructorsService,
  getUserDetailsService,
  updateUserVerificationService,
  updateOwnProfileService,
} from "../services/userService";
import { getInstructorOnboardingLinkService } from "../services/stripeService";
import {
  GetInstructorsQuery,
  UserIdParams,
  UpdateUserVerificationBody,
  UpdateProfileBody,
  UserRoleQuery,
} from "../types/userType";
import sendResponse from "../utils/sendResponse";

export const getInstructors = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.validatedQuery as GetInstructorsQuery;

    const { instructors, pagination } = await getInstructorsService(query);

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

    const user = await getUserDetailsService(id, role);

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

    sendResponse(res, 200, {
      status: "success",
      message: body.isVerified
        ? `${role.charAt(0).toUpperCase() + role.slice(1)} approved successfully`
        : `${role.charAt(0).toUpperCase() + role.slice(1)} rejected successfully`,
      data: { user },
    });
  },
);
