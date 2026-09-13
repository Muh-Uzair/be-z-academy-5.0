import { Router } from "express";
import {
  getEnrollments,
  getEnrollmentDetails,
  updateEnrollmentProgress,
} from "../controllers/enrollmentController";
import validation from "../middlewares/validation";
import protect from "../middlewares/protect";
import {
  enrollmentIdParamsSchema,
  getEnrollmentsQuerySchema,
  updateEnrollmentProgressBodySchema,
} from "../validations/enrollmentValidation";

const enrollmentRouter = Router();

enrollmentRouter.get(
  "/",
  protect,
  validation(getEnrollmentsQuerySchema, "query"),
  getEnrollments,
);

enrollmentRouter.get(
  "/:id",
  protect,
  validation(enrollmentIdParamsSchema, "params"),
  getEnrollmentDetails,
);

enrollmentRouter.patch(
  "/:id/progress",
  protect,
  validation(enrollmentIdParamsSchema, "params"),
  validation(updateEnrollmentProgressBodySchema, "body"),
  updateEnrollmentProgress,
);

export default enrollmentRouter;
