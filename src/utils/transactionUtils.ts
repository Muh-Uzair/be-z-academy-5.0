import AppError from "@src/utils/appError";
import { Role } from "@src/models/userModel";

export const verifyTransactionAccessOrThrow = (transaction: any, user: { id: string; role: string }) => {
  if (user.role === Role.Instructor && transaction.instructor?._id?.toString() !== user.id) {
    throw new AppError(
      403,
      "You do not have permission to access this transaction",
    );
  }

  if (user.role === Role.Student && transaction.student?._id?.toString() !== user.id) {
    throw new AppError(
      403,
      "You do not have permission to access this transaction",
    );
  }
};
