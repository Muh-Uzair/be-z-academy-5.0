import { PipelineStage } from "mongoose";
import UserModel, { Role } from "@src/models/userModel";
import AppError from "@src/utils/appError";
import { sendVerificationStatusEmail } from "@src/utils/email";
import {
  GetInstructorsQuery,
  UpdateInstructorVerificationBody,
} from "@src/types/userTypes";

export const getInstructorsService = async (
  query: GetInstructorsQuery,
): Promise<any> => {
  // Step 1: Build the base pipeline, always scoped to the instructor role
  const pipeline: PipelineStage[] = [];

  const matchStage: Record<string, unknown> = { role: "instructor" };
  if (query.isVerified !== undefined) {
    matchStage.isVerified = query.isVerified;
  }

  pipeline.push({ $match: matchStage });

  // Step 2: Apply the optional search filter
  if (query.search) {
    pipeline.push({
      $match: {
        $or: [
          { fullName: { $regex: query.search, $options: "i" } },
          { email: { $regex: query.search, $options: "i" } },
        ],
      },
    });
  }

  // Step 3: Clone the pipeline for a total count before pagination is applied
  const countPipeline = [...pipeline, { $count: "total" }];

  // Step 4: Apply pagination to the main pipeline
  pipeline.push({ $skip: (query.page - 1) * query.limit });
  pipeline.push({ $limit: query.limit });

  // Step 5: Run both pipelines in parallel
  const [instructors, countResult] = await Promise.all([
    UserModel.aggregate(pipeline),
    UserModel.aggregate(countPipeline),
  ]);

  // Step 6: Compute pagination metadata
  const totalDocuments = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(totalDocuments / query.limit);

  return {
    instructors,
    pagination: {
      page: query.page,
      limit: query.limit,
      totalDocuments,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPrevPage: query.page > 1,
    },
  };
};

export const getUserByIdService = async (
  id: string,
  role: Role,
): Promise<any> => {
  // Step 1: Find the user, scoped to the expected role
  const user = await UserModel.findOne({ _id: id, role });

  // Step 2: Ensure it exists
  if (!user) {
    throw new AppError(404, `${role} not found`);
  }

  return user;
};

export const updateUserService = async (
  id: string,
  updateData: Record<string, unknown>,
): Promise<any> => {
  // Step 1: Apply the update
  const updatedUser = await UserModel.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  // Step 2: Ensure the user existed
  if (!updatedUser) {
    throw new AppError(404, "User not found");
  }

  return updatedUser;
};

export const updateUserVerificationService = async (
  id: string,
  role: Role,
  body: UpdateInstructorVerificationBody,
): Promise<any> => {
  // Step 1: Ensure the user exists and has the expected role
  const user = await UserModel.findOne({ _id: id, role });
  if (!user) {
    throw new AppError(404, `${role} not found`);
  }

  // Step 2: Guard against redundant verify/unverify calls
  if (user.isVerified === body.isVerified) {
    const message = body.isVerified
      ? `${user.role} is already verified`
      : `${user.role} is already unverified`;
    throw new AppError(400, message);
  }

  // Step 3: Update the user, tracking the rejection timestamp when rejecting
  const updatedUser = await updateUserService(id, {
    ...body,
    ...(body.isVerified ? {} : { lastVerificationRejectedAt: new Date() }),
  });

  // Step 4: Notify the user by email
  await sendVerificationStatusEmail({
    email: updatedUser.email,
    fullName: updatedUser.fullName,
    isVerified: body.isVerified,
    rejectionReason: body.verificationRejectionReason,
  });

  return updatedUser;
};
