import { z } from "zod";
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

export type CourseIdParams = z.infer<typeof courseIdParamsSchema>;
export type StudentIdParams = z.infer<typeof studentIdParamsSchema>;
export type InstructorIdParams = z.infer<typeof instructorIdParamsSchema>;
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
export type GetPublicCoursesQuery = z.infer<typeof getPublicCoursesQuerySchema>;
