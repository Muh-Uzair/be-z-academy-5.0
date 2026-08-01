import { Request, Response } from "express";
import catchAsync from "@src/utils/catchAsync";
import {
  getInstructorsService,
  getUserByIdService,
  updateUserVerificationService,
  updateOwnProfileService,
} from "@src/services/userServices";
import { getInstructorOnboardingLinkService } from "@src/services/stripeServices";
import {
  GetInstructorsQuery,
  InstructorIdParams,
  UpdateInstructorVerificationBody,
  UpdateProfileBody,
} from "@src/types/userTypes";
import sendResponse from "@src/utils/sendResponse";
import { Role } from "@src/models/userModel";

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

export const getInstructorDetails = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as InstructorIdParams;

    const instructor = await getUserByIdService(id, Role.Instructor);

    sendResponse(res, 200, {
      status: "success",
      message: "Instructor details fetched successfully",
      data: { instructor },
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

export const updateInstructorVerification = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as InstructorIdParams;
    const body = req.validatedBody as UpdateInstructorVerificationBody;

    const instructor = await updateUserVerificationService(
      id,
      Role.Instructor,
      body,
    );

    sendResponse(res, 200, {
      status: "success",
      message: body.isVerified
        ? "Instructor approved successfully"
        : "Instructor rejected successfully",
      data: { instructor },
    });
  },
);
