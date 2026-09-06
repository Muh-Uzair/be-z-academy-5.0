import { Types } from "mongoose";
import AppError from "./appError";
import { Role } from "../models/userModel";

// Only the fields this check actually reads — matches the shape left after
// TRANSACTION_LOOKUP_STAGES' final $project, which drops the raw
// student/instructor ObjectId fields in favor of the joined *Details docs.
export interface TransactionAccessSubject {
  studentDetails?: { _id: Types.ObjectId };
  instructorDetails?: { _id: Types.ObjectId };
}

export const verifyTransactionAccessOrThrow = (
  transaction: TransactionAccessSubject,
  user: { id: string; role: string },
): void => {
  if (
    user.role === Role.Instructor &&
    transaction.instructorDetails?._id?.toString() !== user.id
  ) {
    throw new AppError(
      403,
      "You do not have permission to access this transaction",
    );
  }

  if (
    user.role === Role.Student &&
    transaction.studentDetails?._id?.toString() !== user.id
  ) {
    throw new AppError(
      403,
      "You do not have permission to access this transaction",
    );
  }
};
