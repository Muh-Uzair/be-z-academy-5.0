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
} from "@src/controllers/courseController";
import validation from "@src/middlewares/validation";
import protect from "@src/middlewares/protect";
import optionalAuth from "@src/middlewares/optionalAuth";
import restrictTo from "@src/middlewares/restrictTo";
import requireStripeOnboarding from "@src/middlewares/courseMiddlewares";
import { Role } from "@src/models/userModel";
import {
  courseIdParamsSchema,
  createCourseSchema,
  updateCourseSchema,
  updateCourseVerificationSchema,
  uploadCourseThumbnailSchema,
  uploadCourseVideoSchema,
  getCoursesQuerySchema,
} from "@src/validations/courseValidations";

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
