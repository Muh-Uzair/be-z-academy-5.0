import { Router } from "express";
import {
  getEnrollments,
  getEnrollmentDetails,
} from "@src/controllers/enrollmentController";
import validation from "@src/middlewares/validation";
import protect from "@src/middlewares/protect";
import {
  enrollmentIdParamsSchema,
  getEnrollmentsQuerySchema,
} from "@src/validations/enrollmentValidations";

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
