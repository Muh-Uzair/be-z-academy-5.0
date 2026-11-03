import AppError from "./appError";
import { Role } from "../models/userModel";

// Role rules for who may view whose details (GET /users/user/:id):
//   admin      → anyone
//   instructor → other instructors, and students (only those enrolled in one
//                of their own courses - that check needs the database, so the
//                service does it); never admins
//   student    → instructors only; never other students or admins
// Everyone may always view their own record (GET /auth/me relies on this).
export const verifyUserViewAccessOrThrow = (
  targetId: string,
  targetRole: Role,
  requester: { id: string; role: Role },
): void => {
  const isOwnRecord =
    targetId === requester.id && targetRole === requester.role;

  if (isOwnRecord) {
    return;
  }

  if (requester.role === Role.Student && targetRole !== Role.Instructor) {
    throw new AppError(
      403,
      `You do not have permission to view this ${targetRole}'s details`,
    );
  }

  if (requester.role === Role.Instructor && targetRole === Role.Admin) {
    throw new AppError(
      403,
      `You do not have permission to view this ${targetRole}'s details`,
    );
  }
};
