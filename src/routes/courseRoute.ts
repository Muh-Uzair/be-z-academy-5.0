import { Router } from "express";
import {
  uploadCourseThumbnail,
  uploadCourseVideo,
  createCourse,
  getCourses,
  getPublicCourses,
  getCourseDetails,
  getPublicCourseDetails,
  updateCourse,
  updateCourseVerification,
  deleteCourse,
  createCoursePaymentIntent,
  requestCourseRefund,
  getCourseCompletionStatus,
} from "../controllers/courseController";
import validation from "../middlewares/validation";
import protect from "../middlewares/protect";
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
  getPublicCoursesQuerySchema,
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
// Both routes below require auth; visibility/detail level then depends on
// the caller's role — see getCoursesService / getCourseDetailsService.

courseRouter.get(
  "/",
  protect,
  validation(getCoursesQuerySchema, "query"),
  getCourses,
);

// Public — no auth required. Must stay above GET /:id so "/public" isn't
// swallowed by that param route.
courseRouter.get(
  "/public",
  validation(getPublicCoursesQuerySchema, "query"),
  getPublicCourses,
);

courseRouter.get(
  "/:id",
  protect,
  validation(courseIdParamsSchema, "params"),
  getCourseDetails,
);

// Public — no auth required.
courseRouter.get(
  "/:id/public",
  validation(courseIdParamsSchema, "params"),
  getPublicCourseDetails,
);

export default courseRouter;
