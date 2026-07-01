import { Request, Response, NextFunction } from "express";
import AppError from "@src/utils/appError";
import { verifyAccessToken } from "@src/utils/jwt";

/**
 * Verifies the accessToken cookie and attaches the decoded user (id, role) to req.user.
 * Must run before any middleware/controller that relies on req.user (e.g. restrictTo).
 */
const protect = (req: Request, _res: Response, next: NextFunction): void => {
  const accessToken = req.cookies?.accessToken as string | undefined;

  if (!accessToken) {
    return next(new AppError(401, "You are not logged in. Please sign in to continue"));
  }

  try {
    const decoded = verifyAccessToken(accessToken);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch {
    next(new AppError(401, "Invalid or expired access token"));
  }
};

export default protect;
