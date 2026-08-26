import { PipelineStage } from "mongoose";
import UserModel, { Role } from "@src/models/userModel";
import AppError from "@src/utils/appError";
import { sendVerificationStatusEmail } from "@src/utils/email";
import { PROFILE_UPDATABLE_FIELDS } from "@src/constants/userConstant";
import APIFeatures from "@src/utils/apiFeatures";
import {
  GetInstructorsQuery,
  UpdateUserVerificationBody,
  UpdateProfileBody,
} from "@src/types/userType";

// FUNCTION
export const getInstructorsService = async (
  query: GetInstructorsQuery,
): Promise<any> => {
  // Step 1: Scope the base pipeline to the instructor role
  const basePipeline: PipelineStage[] = [{ $match: { role: "instructor" } }];

  // Step 2: Layer the query-driven filter, search, sort, projection and pagination stages
  const { data: instructors, pagination } = await new APIFeatures(
    UserModel,
    query,
    basePipeline,
  )
    .filter(["isVerified"])
    .search(["fullName", "email"])
    .sort()
    .projection()
    .paginate()
    .exec();

  return { instructors, pagination };
};

// Projection used for the current-user response — must stay in sync with the
// signin user shape so both endpoints return identical data.
const USER_PUBLIC_PROJECTION =
  "_id fullName email role avatar bio highestEducation yearsOfExperience isVerified createdAt updatedAt";

// FUNCTION
export const getUserDetailsService = async (
  id: string,
  role: Role,
): Promise<any> => {
  // Step 1: Find the user, scoped to the expected role, selecting only public fields
  const user = await UserModel.findOne({ _id: id, role }).select(
    USER_PUBLIC_PROJECTION,
  );

  // Step 2: Ensure it exists
  if (!user) {
    throw new AppError(404, `${role} not found`);
  }

  return user;
};

export { USER_PUBLIC_PROJECTION };

// FUNCTION
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

// FUNCTION
export const updateOwnProfileService = async (
  id: string,
  role: Role,
  body: UpdateProfileBody,
): Promise<any> => {
  // Step 1: Keep only the fields this role is permitted to change
  const allowedFields = PROFILE_UPDATABLE_FIELDS[role] as readonly string[];
  const disallowedFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field),
  );

  if (disallowedFields.length > 0) {
    throw new AppError(
      403,
      `${role}s are not allowed to update: ${disallowedFields.join(", ")}`,
    );
  }

  // Step 2: Apply the update
  return updateUserService(id, body);
};

// FUNCTION
export const updateUserVerificationService = async (
  id: string,
  role: Role,
  body: UpdateUserVerificationBody,
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
