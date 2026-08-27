import { Router } from "express";
import {
  uploadCourseThumbnail,
  uploadCourseVideo,
  createCourse,
  getCourses,
  getCourseDetails,
  updateCourse,
  updateCourseVerification,
  deleteCourse,
  createCoursePaymentIntent,
  requestCourseRefund,
  getCourseCompletionStatus,
} from "../controllers/courseController";
import validation from "../middlewares/validation";
import protect from "../middlewares/protect";
import optionalAuth from "../middlewares/optionalAuth";
import restrictTo from "../middlewares/restrictTo";
import requireStripeOnboarding from "../middlewares/courseMiddleware";
import { Role } from "../models/userModel";
import {
  courseIdParamsSchema,
  createCourseSchema,
  updateCourseSchema,
  updateCourseVerificationSchema,
  uploadCourseThumbnailSchema,
  uploadCourseVideoSchema,
  getCoursesQuerySchema,
} from "../validations/courseValidation";

const courseRouter = Router();

// ─── Admin Routes ─────────────────────────────────────────────────────────────

courseRouter.patch(
  "/:id/verification",
  protect,
  restrictTo(Role.Admin),
  validation(courseIdParamsSchema, "params"),
  validation(updateCourseVerificationSchema, "body"),
  updateCourseVerification,
);

// ─── Instructor Routes ────────────────────────────────────────────────────────

courseRouter.post(
  "/upload-thumbnail",
  protect,
  restrictTo(Role.Instructor),
  validation(uploadCourseThumbnailSchema, "body"),
  uploadCourseThumbnail,
);

courseRouter.post(
  "/upload-video",
  protect,
  restrictTo(Role.Instructor),
  validation(uploadCourseVideoSchema, "body"),
  uploadCourseVideo,
);

courseRouter.post(
  "/",
  protect,
  restrictTo(Role.Instructor),
  requireStripeOnboarding,
  validation(createCourseSchema, "body"),
  createCourse,
);

courseRouter.patch(
  "/:id",
  protect,
  restrictTo(Role.Instructor),
  validation(courseIdParamsSchema, "params"),
  validation(updateCourseSchema, "body"),
  updateCourse,
);

courseRouter.delete(
  "/:id",
  protect,
  restrictTo(Role.Instructor),
  validation(courseIdParamsSchema, "params"),
  deleteCourse,
);

// ─── Student Routes ───────────────────────────────────────────────────────────

courseRouter.post(
  "/:id/payment-intent",
  protect,
  restrictTo(Role.Student),
  validation(courseIdParamsSchema, "params"),
  createCoursePaymentIntent,
);

courseRouter.post(
  "/:id/refund",
  protect,
  restrictTo(Role.Student),
  validation(courseIdParamsSchema, "params"),
  requestCourseRefund,
);

courseRouter.get(
  "/:id/completion-status",
  protect,
  restrictTo(Role.Student),
  validation(courseIdParamsSchema, "params"),
  getCourseCompletionStatus,
);

// ─── Shared Routes ────────────────────────────────────────────────────────────

courseRouter.get(
  "/",
  optionalAuth,
  validation(getCoursesQuerySchema, "query"),
  getCourses,
);

courseRouter.get(
  "/:id",
  optionalAuth,
  validation(courseIdParamsSchema, "params"),
  getCourseDetails,
);

export default courseRouter;
