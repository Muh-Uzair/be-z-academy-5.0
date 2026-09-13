import { HydratedDocument, PipelineStage } from "mongoose";
import UserModel, { Role, UserType } from "../models/userModel";
import AppError from "../utils/appError";
import { sendVerificationStatusEmail } from "../utils/email";
import { PROFILE_UPDATABLE_FIELDS } from "../constants/userConstant";
import APIFeatures from "../utils/apiFeatures";
import { Pagination } from "../utils/sendResponse";
import { Types } from "mongoose";
import EnrollmentModel from "../models/enrollmentModel";
import {
  GetInstructorsQuery,
  GetStudentsQuery,
  UpdateUserVerificationBody,
  UpdateProfileBody,
} from "../types/userType";

// Projection used for both the current-user response and the instructor
// list, so no endpoint ever exposes password/otp/stripe internals by default.
const USER_PUBLIC_PROJECTION =
  "_id fullName email role avatar bio highestEducation yearsOfExperience isVerified createdAt updatedAt";

// Same fields as USER_PUBLIC_PROJECTION, shaped as a $project stage. Applied
// as the aggregation's default field list; a caller-supplied `projection`
// query param can only narrow further, never re-add excluded fields.
const USER_LIST_PROJECTION: PipelineStage.Project = {
  $project: USER_PUBLIC_PROJECTION.split(" ").reduce<Record<string, 1>>(
    (project, field) => ({ ...project, [field]: 1 }),
    {},
  ),
};

export type InstructorListItem = Pick<
  UserType,
  | "fullName"
  | "email"
  | "role"
  | "avatar"
  | "bio"
  | "highestEducation"
  | "yearsOfExperience"
  | "isVerified"
  | "createdAt"
  | "updatedAt"
> & { _id: unknown };

export type StudentListItem = InstructorListItem;

// FUNCTION
export const getInstructorsService = async (
  query: GetInstructorsQuery,
  user: { id: string; role: Role },
): Promise<{
  instructors: InstructorListItem[];
  pagination: Pagination | null;
}> => {
  // Step 1: Scope the base pipeline by role - admins see every instructor,
  // students see only instructors whose course they have bought.
  if (user.role === Role.Student) {
    const basePipeline: PipelineStage[] = [
      { $match: { student: new Types.ObjectId(user.id) } },
      { $group: { _id: "$instructor" } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "instructor",
        },
      },
      { $unwind: "$instructor" },
      { $replaceRoot: { newRoot: "$instructor" } },
      USER_LIST_PROJECTION,
    ];

    const { data: instructors, pagination } = await new APIFeatures(
      EnrollmentModel,
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
  }

  // Step 2: Admin - scope to the instructor role and strip sensitive/internal fields by default
  const basePipeline: PipelineStage[] = [
    { $match: { role: "instructor" } },
    USER_LIST_PROJECTION,
  ];

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

// FUNCTION
export const getStudentsService = async (
  query: GetStudentsQuery,
  user: { id: string; role: Role },
): Promise<{
  students: StudentListItem[];
  pagination: Pagination | null;
}> => {
  // Step 1: Scope the base pipeline by role - admins see every student,
  // instructors see only students enrolled in their own courses.
  if (user.role === Role.Instructor) {
    const basePipeline: PipelineStage[] = [
      { $match: { instructor: new Types.ObjectId(user.id) } },
      { $group: { _id: "$student" } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      { $replaceRoot: { newRoot: "$student" } },
      USER_LIST_PROJECTION,
    ];

    const { data: students, pagination } = await new APIFeatures(
      EnrollmentModel,
      query,
      basePipeline,
    )
      .search(["fullName", "email"])
      .sort()
      .projection()
      .paginate()
      .exec();

    return { students, pagination };
  }

  const basePipeline: PipelineStage[] = [
    { $match: { role: "student" } },
    USER_LIST_PROJECTION,
  ];

  const { data: students, pagination } = await new APIFeatures(
    UserModel,
    query,
    basePipeline,
  )
    .search(["fullName", "email"])
    .sort()
    .projection()
    .paginate()
    .exec();

  return { students, pagination };
};

// FUNCTION
export const getUserDetailsService = async (
  id: string,
  role: Role,
): Promise<HydratedDocument<UserType>> => {
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
): Promise<HydratedDocument<UserType>> => {
  // Step 1: Apply the update, restricted to the same public projection as
  // every other user-facing read, since only `password` has `select: false`
  // and findByIdAndUpdate would otherwise return otp/stripe/internal fields
  const updatedUser = await UserModel.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).select(USER_PUBLIC_PROJECTION);

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
): Promise<HydratedDocument<UserType>> => {
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
): Promise<HydratedDocument<UserType>> => {
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
