import AppError from "./appError";
import { Role } from "../models/userModel";

export const verifyEnrollmentAccessOrThrow = (enrollment: any, user: { userId: string; role: string }) => {
  if (user.role === Role.Instructor && enrollment.instructor?._id?.toString() !== user.userId) {
    throw new AppError(
      403,
      "You do not have permission to access this enrollment",
    );
  }

  if (user.role === Role.Student && enrollment.student?._id?.toString() !== user.userId) {
    throw new AppError(
      403,
      "You do not have permission to access this enrollment",
    );
  }
};
