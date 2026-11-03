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
// Api # 1
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
// Api # 2
courseRouter.post(
  "/upload-thumbnail",
  protect,
  restrictTo(Role.Instructor),
  validation(uploadCourseThumbnailSchema, "body"),
  uploadCourseThumbnail,
);

// (root)/api/v1/courses/upload-video
// Api # 3
courseRouter.post(
  "/upload-video",
  protect,
  restrictTo(Role.Instructor),
  validation(uploadCourseVideoSchema, "body"),
  uploadCourseVideo,
);

// (root)/api/v1/courses
// Api # 4
courseRouter.post(
  "/",
  protect,
  restrictTo(Role.Instructor),
  requireStripeOnboarding,
  validation(createCourseSchema, "body"),
  createCourse,
);

// (root)/api/v1/courses/:id
// Api # 5
courseRouter.patch(
  "/:id",
  protect,
  restrictTo(Role.Instructor),
  validation(courseIdParamsSchema, "params"),
  validation(updateCourseSchema, "body"),
  updateCourse,
);

// (root)/api/v1/courses/:id
// Api # 6
courseRouter.delete(
  "/:id",
  protect,
  restrictTo(Role.Instructor),
  validation(courseIdParamsSchema, "params"),
  deleteCourse,
);

// DIVIDER Student Routes ---------------------------------------------------------

// (root)/api/v1/courses/:id/payment-intent
// Api # 7
courseRouter.post(
  "/:id/payment-intent",
  protect,
  restrictTo(Role.Student),
  validation(courseIdParamsSchema, "params"),
  createCoursePaymentIntent,
);

// (root)/api/v1/courses/:id/refund
// Api # 8
courseRouter.post(
  "/:id/refund",
  protect,
  restrictTo(Role.Student),
  validation(courseIdParamsSchema, "params"),
  requestCourseRefund,
);

// (root)/api/v1/courses/:id/refund-eligibility
// Api # 9
courseRouter.get(
  "/:id/refund-eligibility",
  protect,
  restrictTo(Role.Student),
  validation(courseIdParamsSchema, "params"),
  getCourseRefundEligibility,
);

// (root)/api/v1/courses/:id/completion-status
// Api # 10
courseRouter.get(
  "/:id/completion-status",
  protect,
  restrictTo(Role.Student),
  validation(courseIdParamsSchema, "params"),
  getCourseCompletionStatus,
);

// (root)/api/v1/courses/:id/issue-certificate
// Api # 11
courseRouter.get(
  "/:id/issue-certificate",
  protect,
  restrictTo(Role.Student),
  validation(courseIdParamsSchema, "params"),
  issueCourseCertificate,
);

// DIVIDER Admin + Instructor + Student Routes ---------------------------------------------------------

// (root)/api/v1/courses
// Api # 12
courseRouter.get(
  "/",
  protect,
  validation(getCoursesQuerySchema, "query"),
  getCourses,
);

// DIVIDER Admin + Instructor Routes ---------------------------------------------------------

// (root)/api/v1/courses/student/:id
// Api # 13
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
// Api # 14
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
// Api # 15
courseRouter.get("/featured", getFeaturedCourses);

// (root)/api/v1/courses/trending
// Api # 16
courseRouter.get("/trending", getTrendingCourses);

// (root)/api/v1/courses/public
// Api # 17
courseRouter.get(
  "/public",
  validation(getPublicCoursesQuerySchema, "query"),
  getPublicCourses,
);

// (root)/api/v1/courses/:id/public
// Api # 18
courseRouter.get(
  "/:id/public",
  validation(courseIdParamsSchema, "params"),
  getPublicCourseDetails,
);

// DIVIDER Admin + Instructor + Student Routes ---------------------------------------------------------

// (root)/api/v1/courses/:id
// Api # 19
courseRouter.get(
  "/:id",
  protect,
  validation(courseIdParamsSchema, "params"),
  getCourseDetails,
);

export default courseRouter;
