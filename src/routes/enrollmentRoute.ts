import { Router } from "express";
import {
  getEnrollments,
  getEnrollmentDetails,
} from "../controllers/enrollmentController";
import validation from "../middlewares/validation";
import protect from "../middlewares/protect";
import {
  enrollmentIdParamsSchema,
  getEnrollmentsQuerySchema,
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

export default enrollmentRouter;
