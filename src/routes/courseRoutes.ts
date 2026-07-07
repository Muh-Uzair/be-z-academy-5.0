import { Router } from "express";
import {
  uploadCourseThumbnail,
  uploadCourseVideo,
  createCourse,
  getCourses,
  getCourseDetails,
  updateCourse,
  deleteCourse,
} from "@src/controllers/courseController";
import validationMiddleware from "@src/middlewares/validationMiddleware";
import protectMiddleware from "@src/middlewares/protectMiddleware";
import optionalAuthMiddleware from "@src/middlewares/optionalAuthMiddleware";
import restrictToMiddleware from "@src/middlewares/restrictToMiddleware";
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

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// ─── Instructor Routes ────────────────────────────────────────────────────────

courseRouter.post(
  "/upload-thumbnail",
  protectMiddleware,
  restrictToMiddleware(Role.Instructor),
  validationMiddleware(uploadCourseThumbnailSchema, "body"),
  uploadCourseThumbnail,
);

courseRouter.post(
  "/upload-video",
  protectMiddleware,
  restrictToMiddleware(Role.Instructor),
  validationMiddleware(uploadCourseVideoSchema, "body"),
  uploadCourseVideo,
);

courseRouter.post(
  "/",
  protectMiddleware,
  restrictToMiddleware(Role.Instructor),
  validationMiddleware(createCourseSchema, "body"),
  createCourse,
);

courseRouter.patch(
  "/:id",
  protectMiddleware,
  restrictToMiddleware(Role.Instructor),
  validationMiddleware(courseIdParamsSchema, "params"),
  validationMiddleware(updateCourseSchema, "body"),
  updateCourse,
);

courseRouter.delete(
  "/:id",
  protectMiddleware,
  restrictToMiddleware(Role.Instructor),
  validationMiddleware(courseIdParamsSchema, "params"),
  deleteCourse,
);

// ─── Student Routes ───────────────────────────────────────────────────────────

// ─── Shared Routes ────────────────────────────────────────────────────────────

courseRouter.get(
  "/",
  optionalAuthMiddleware,
  validationMiddleware(getCoursesQuerySchema, "query"),
  getCourses,
);

courseRouter.get(
  "/:id",
  optionalAuthMiddleware,
  validationMiddleware(courseIdParamsSchema, "params"),
  getCourseDetails,
);

export default courseRouter;
