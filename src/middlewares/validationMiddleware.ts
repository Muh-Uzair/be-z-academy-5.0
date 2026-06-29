import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodSchema } from "zod";
import AppError from "@src/utils/appError";

const validationMiddleware = (schema: ZodSchema): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((iss) => ({
        field: iss.path.join("."),
        message: iss.message,
      }));

      next(new AppError(400, "Validation failed", { errors }));
      return;
    }

    req.body = result.data;
    next();
  };
};

export default validationMiddleware;
