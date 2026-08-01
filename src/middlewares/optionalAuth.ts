import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@src/utils/jwt";

/**
 * Attaches req.user (id, role) if a valid accessToken cookie is present.
 * Unlike protect, it never blocks the request - missing/invalid tokens are
 * ignored so both logged-in and anonymous users can hit the same route.
 */
const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const accessToken = req.cookies?.accessToken as string | undefined;

  if (!accessToken) {
    return next();
  }

  try {
    const decoded = verifyAccessToken(accessToken);
    req.user = { id: decoded.id, role: decoded.role };
  } catch {
    // ignore invalid/expired token - treat request as anonymous
  }

  next();
};

export default optionalAuth;
