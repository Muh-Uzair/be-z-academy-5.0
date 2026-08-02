import { z } from "zod";
import {
  courseIdParamsSchema,
  createCourseSchema,
  updateCourseSchema,
  updateCourseVerificationSchema,
  uploadCourseThumbnailSchema,
  uploadCourseVideoSchema,
  getCoursesQuerySchema,
} from "@src/validations/courseValidation";

export type CourseIdParams = z.infer<typeof courseIdParamsSchema>;
export type CreateCourseBody = z.infer<typeof createCourseSchema>;
export type UpdateCourseBody = z.infer<typeof updateCourseSchema>;
export type UpdateCourseVerificationBody = z.infer<
  typeof updateCourseVerificationSchema
>;
export type UploadCourseThumbnailBody = z.infer<
  typeof uploadCourseThumbnailSchema
>;
export type UploadCourseVideoBody = z.infer<typeof uploadCourseVideoSchema>;
export type GetCoursesQuery = z.infer<typeof getCoursesQuerySchema>;
