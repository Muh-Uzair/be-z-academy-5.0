import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodSchema } from "zod";
import AppError from "@src/utils/appError";

type ValidationSource = "body" | "query" | "params";

const validationMiddleware = (
  schema: ZodSchema,
  source: ValidationSource = "body",
): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map((iss) => ({
        field: iss.path.join("."),
        message: iss.message,
      }));

      next(new AppError(400, "Validation failed", { errors }));
      return;
    }

    if (source === "body") {
      req.body = result.data;
    } else if (source === "query") {
      // req.query is a getter in Express 5 that re-parses req.url on every
      // access, so mutating/reassigning it does not persist. Store the
      // validated data separately instead.
      req.validatedQuery = result.data as Record<string, unknown>;
    } else {
      req.validatedParams = result.data as Record<string, unknown>;
    }

    next();
  };
};

export default validationMiddleware;
