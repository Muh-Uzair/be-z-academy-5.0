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

// DIVIDER Admin Routes ---------------------------------------------------------

// DIVIDER Instructor Routes ---------------------------------------------------------

// DIVIDER Student Routes ---------------------------------------------------------

// DIVIDER Admin + Instructor + Student Routes ---------------------------------------------------------

// (root)/api/v1/enrollments
enrollmentRouter.get(
  "/",
  protect,
  validation(getEnrollmentsQuerySchema, "query"),
  getEnrollments,
);

// (root)/api/v1/enrollments/:id
enrollmentRouter.get(
  "/:id",
  protect,
  validation(enrollmentIdParamsSchema, "params"),
  getEnrollmentDetails,
);

// (root)/api/v1/enrollments/:id/progress
enrollmentRouter.patch(
  "/:id/progress",
  protect,
  validation(enrollmentIdParamsSchema, "params"),
  validation(updateEnrollmentProgressBodySchema, "body"),
  updateEnrollmentProgress,
);

// DIVIDER Admin + Instructor Routes ---------------------------------------------------------

// DIVIDER Admin + Student Routes ---------------------------------------------------------

// DIVIDER Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Public Routes ---------------------------------------------------------

export default enrollmentRouter;
