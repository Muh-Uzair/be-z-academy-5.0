import { Types } from "mongoose";
import AppError from "./appError";
import { Role } from "../models/userModel";

// Only the fields this check actually reads — matches the shape left after
// ENROLLMENT_LOOKUP_STAGES' final $project, which drops the raw
// student/instructor ObjectId fields in favor of the joined *Details docs.
export interface EnrollmentAccessSubject {
  studentDetails?: { _id: Types.ObjectId };
  instructorDetails?: { _id: Types.ObjectId };
}

export const verifyEnrollmentAccessOrThrow = (
  enrollment: EnrollmentAccessSubject,
  user: { userId: string; role: string },
): void => {
  if (
    user.role === Role.Instructor &&
    enrollment.instructorDetails?._id?.toString() !== user.userId
  ) {
    throw new AppError(
      403,
      "You do not have permission to access this enrollment",
    );
  }

  if (
    user.role === Role.Student &&
    enrollment.studentDetails?._id?.toString() !== user.userId
  ) {
    throw new AppError(
      403,
      "You do not have permission to access this enrollment",
    );
  }
};
