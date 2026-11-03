import { Router } from "express";
import {
  uploadCourseThumbnail,
  uploadCourseVideo,
  createCourse,
  getCourses,
  getStudentCourses,
  getInstructorCourses,
  getPublicCourses,
  getFeaturedCourses,
  getTrendingCourses,
  getCourseDetails,
  getPublicCourseDetails,
  updateCourse,
  updateCourseVerification,
  deleteCourse,
  createCoursePaymentIntent,
  requestCourseRefund,
  getCourseRefundEligibility,
  getCourseCompletionStatus,
  issueCourseCertificate,
} from "../controllers/courseController";
import validation from "../middlewares/validation";
import protect from "../middlewares/protect";
import restrictTo from "../middlewares/restrictTo";
import requireStripeOnboarding from "../middlewares/courseMiddleware";
import { Role } from "../models/userModel";
import {
  courseIdParamsSchema,
  studentIdParamsSchema,
  instructorIdParamsSchema,
  createCourseSchema,
  updateCourseSchema,
  updateCourseVerificationSchema,
  uploadCourseThumbnailSchema,
  uploadCourseVideoSchema,
  getCoursesQuerySchema,
  getPublicCoursesQuerySchema,
} from "../validations/courseValidation";

const courseRouter = Router();

// DIVIDER Admin Routes ---------------------------------------------------------

// (root)/api/v1/courses/:id/verification
courseRouter.patch(
  "/:id/verification",
  protect,
  restrictTo(Role.Admin),
  validation(courseIdParamsSchema, "params"),
  validation(updateCourseVerificationSchema, "body"),
  updateCourseVerification,
);

// DIVIDER Instructor Routes ---------------------------------------------------------

// (root)/api/v1/courses/upload-thumbnail
courseRouter.post(
  "/upload-thumbnail",
  protect,
  restrictTo(Role.Instructor),
  validation(uploadCourseThumbnailSchema, "body"),
  uploadCourseThumbnail,
);

// (root)/api/v1/courses/upload-video
courseRouter.post(
  "/upload-video",
  protect,
  restrictTo(Role.Instructor),
  validation(uploadCourseVideoSchema, "body"),
  uploadCourseVideo,
);

// (root)/api/v1/courses
courseRouter.post(
  "/",
  protect,
  restrictTo(Role.Instructor),
  requireStripeOnboarding,
  validation(createCourseSchema, "body"),
  createCourse,
);

// (root)/api/v1/courses/:id
courseRouter.patch(
  "/:id",
  protect,
  restrictTo(Role.Instructor),
  validation(courseIdParamsSchema, "params"),
  validation(updateCourseSchema, "body"),
  updateCourse,
);

// (root)/api/v1/courses/:id
courseRouter.delete(
  "/:id",
  protect,
  restrictTo(Role.Instructor),
  validation(courseIdParamsSchema, "params"),
  deleteCourse,
);

// DIVIDER Student Routes ---------------------------------------------------------

// (root)/api/v1/courses/:id/payment-intent
courseRouter.post(
  "/:id/payment-intent",
  protect,
  restrictTo(Role.Student),
  validation(courseIdParamsSchema, "params"),
  createCoursePaymentIntent,
);

// (root)/api/v1/courses/:id/refund
courseRouter.post(
  "/:id/refund",
  protect,
  restrictTo(Role.Student),
  validation(courseIdParamsSchema, "params"),
  requestCourseRefund,
);

// (root)/api/v1/courses/:id/refund-eligibility
courseRouter.get(
  "/:id/refund-eligibility",
  protect,
  restrictTo(Role.Student),
  validation(courseIdParamsSchema, "params"),
  getCourseRefundEligibility,
);

// (root)/api/v1/courses/:id/completion-status
courseRouter.get(
  "/:id/completion-status",
  protect,
  restrictTo(Role.Student),
  validation(courseIdParamsSchema, "params"),
  getCourseCompletionStatus,
);

// (root)/api/v1/courses/:id/issue-certificate
courseRouter.get(
  "/:id/issue-certificate",
  protect,
  restrictTo(Role.Student),
  validation(courseIdParamsSchema, "params"),
  issueCourseCertificate,
);

// DIVIDER Admin + Instructor + Student Routes ---------------------------------------------------------

// (root)/api/v1/courses
courseRouter.get(
  "/",
  protect,
  validation(getCoursesQuerySchema, "query"),
  getCourses,
);

// DIVIDER Admin + Instructor Routes ---------------------------------------------------------

// (root)/api/v1/courses/student/:id
courseRouter.get(
  "/student/:id",
  protect,
  restrictTo(Role.Admin, Role.Instructor),
  validation(studentIdParamsSchema, "params"),
  validation(getCoursesQuerySchema, "query"),
  getStudentCourses,
);

// DIVIDER Admin + Student Routes ---------------------------------------------------------

// (root)/api/v1/courses/instructor/:id
courseRouter.get(
  "/instructor/:id",
  protect,
  restrictTo(Role.Admin, Role.Student),
  validation(instructorIdParamsSchema, "params"),
  validation(getCoursesQuerySchema, "query"),
  getInstructorCourses,
);

// DIVIDER Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Public Routes ---------------------------------------------------------

// (root)/api/v1/courses/featured
courseRouter.get("/featured", getFeaturedCourses);

// (root)/api/v1/courses/trending
courseRouter.get("/trending", getTrendingCourses);

// (root)/api/v1/courses/public
courseRouter.get(
  "/public",
  validation(getPublicCoursesQuerySchema, "query"),
  getPublicCourses,
);

// (root)/api/v1/courses/:id/public
courseRouter.get(
  "/:id/public",
  validation(courseIdParamsSchema, "params"),
  getPublicCourseDetails,
);

// DIVIDER Admin + Instructor + Student Routes ---------------------------------------------------------

// (root)/api/v1/courses/:id
courseRouter.get(
  "/:id",
  protect,
  validation(courseIdParamsSchema, "params"),
  getCourseDetails,
);

export default courseRouter;
