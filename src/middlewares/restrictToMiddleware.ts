import { Request, Response, NextFunction } from "express";
import AppError from "@src/utils/appError";
import UserModel, { Role } from "@src/models/userModel";

/**
 * Restricts access to specific roles.
 * - For authenticated routes, it checks \`req.user.role\`.
 * - For unauthenticated routes (like verify-otp), it looks up the role using \`req.body.email\`.
 */
const restrictTo = (...roles: Role[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let userRole: Role | undefined;

      // 1. Check if user is already authenticated (req.user would be set by a protect middleware)
      const reqUser = (req as any).user;
      if (reqUser && reqUser.role) {
        userRole = reqUser.role as Role;
      } 
      // 2. Fallback for unauthenticated routes: Check if there is an email in the body to identify the user
      else if (req.body && req.body.email) {
        const user = await UserModel.findOne({ email: req.body.email }).select("role");
        if (user) {
          userRole = user.role as Role;
        }
      }

      if (!userRole) {
        return next(new AppError(404, "Could not determine user role for authorization"));
      }

      if (!roles.includes(userRole)) {
        return next(
          new AppError(403, "You do not have permission to perform this action")
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default restrictTo;
