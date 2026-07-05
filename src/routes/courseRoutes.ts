import { Router } from "express";
import {
  uploadCourseThumbnail,
  uploadCourseVideo,
  createCourse,
  getMyCourses,
  getMyCourseDetails,
  updateMyCourse,
  deleteMyCourse,
} from "@src/controllers/courseController";
import validationMiddleware from "@src/middlewares/validationMiddleware";
import protect from "@src/middlewares/protectMiddleware";
import restrictTo from "@src/middlewares/restrictToMiddleware";
import { Role } from "@src/models/userModel";
import {
  courseIdParamsSchema,
  createCourseSchema,
  updateCourseSchema,
  uploadCourseThumbnailSchema,
  uploadCourseVideoSchema,
  getCoursesQuerySchema,
} from "@src/validations/courseValidations";

const courseRouter = Router();

// ─── Instructor Routes ────────────────────────────────────────────────────────

courseRouter.post(
  "/upload-thumbnail",
  protect,
  restrictTo(Role.Instructor),
  validationMiddleware(uploadCourseThumbnailSchema, "body"),
  uploadCourseThumbnail,
);

courseRouter.post(
  "/upload-video",
  protect,
  restrictTo(Role.Instructor),
  validationMiddleware(uploadCourseVideoSchema, "body"),
  uploadCourseVideo,
);

courseRouter.post(
  "/",
  protect,
  restrictTo(Role.Instructor),
  validationMiddleware(createCourseSchema, "body"),
  createCourse,
);

courseRouter.get(
  "/",
  protect,
  restrictTo(Role.Instructor),
  validationMiddleware(getCoursesQuerySchema, "query"),
  getMyCourses,
);

courseRouter.get(
  "/:id",
  protect,
  restrictTo(Role.Instructor),
  validationMiddleware(courseIdParamsSchema, "params"),
  getMyCourseDetails,
);

courseRouter.patch(
  "/:id",
  protect,
  restrictTo(Role.Instructor),
  validationMiddleware(courseIdParamsSchema, "params"),
  validationMiddleware(updateCourseSchema, "body"),
  updateMyCourse,
);

courseRouter.delete(
  "/:id",
  protect,
  restrictTo(Role.Instructor),
  validationMiddleware(courseIdParamsSchema, "params"),
  deleteMyCourse,
);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// ─── Shared Routes ────────────────────────────────────────────────────────────

export default courseRouter;
