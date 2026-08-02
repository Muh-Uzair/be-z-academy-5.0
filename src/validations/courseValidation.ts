import { z } from "zod";
import { CourseLevel } from "@src/models/courseModel";
import {
  COURSE_TITLE_MIN_LENGTH,
  COURSE_TITLE_MAX_LENGTH,
  COURSE_DESCRIPTION_MIN_LENGTH,
  COURSE_DESCRIPTION_MAX_LENGTH,
  COURSE_VERIFICATION_REJECTION_REASON_MAX_LENGTH,
} from "@src/constants/courseConstant";

export const courseIdParamsSchema = z.object({
  id: z.string().min(1, { error: "Course id is required" }),
});

export const createCourseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(COURSE_TITLE_MIN_LENGTH, {
      error: `Title must be at least ${COURSE_TITLE_MIN_LENGTH} characters`,
    })
    .max(COURSE_TITLE_MAX_LENGTH, {
      error: `Title cannot exceed ${COURSE_TITLE_MAX_LENGTH} characters`,
    }),
  description: z
    .string()
    .trim()
    .min(COURSE_DESCRIPTION_MIN_LENGTH, {
      error: `Description must be at least ${COURSE_DESCRIPTION_MIN_LENGTH} characters`,
    })
    .max(COURSE_DESCRIPTION_MAX_LENGTH, {
      error: `Description cannot exceed ${COURSE_DESCRIPTION_MAX_LENGTH} characters`,
    }),
  price: z.coerce.number().min(0, { error: "Price is required" }),
  level: z.enum(Object.values(CourseLevel) as [string, ...string[]], {
    error: "Level must be one of: beginner, intermediate, advanced",
  }),
  category: z.string().trim().min(1, { error: "Category is required" }),
  thumbnailKey: z.string().trim().min(1, { error: "Thumbnail is required" }),
  videoKey: z.string().trim().min(1, { error: "Video is required" }),
});

export const updateCourseVerificationSchema = z
  .object({
    isVerified: z.boolean({ error: "isVerified must be a boolean" }),
    verificationRejectionReason: z
      .string()
      .trim()
      .min(1)
      .max(COURSE_VERIFICATION_REJECTION_REASON_MAX_LENGTH)
      .nullable()
      .optional(),
  })
  .refine((data) => data.isVerified || !!data.verificationRejectionReason, {
    error: "Rejection reason is required when rejecting a course",
    path: ["verificationRejectionReason"],
  });

export const updateCourseSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(COURSE_TITLE_MIN_LENGTH)
      .max(COURSE_TITLE_MAX_LENGTH)
      .optional(),
    description: z
      .string()
      .trim()
      .min(COURSE_DESCRIPTION_MIN_LENGTH)
      .max(COURSE_DESCRIPTION_MAX_LENGTH)
      .optional(),
    thumbnailKey: z.string().trim().min(1).optional(),
    videoKey: z.string().trim().min(1).optional(),
    price: z.coerce.number().min(0).optional(),
    level: z
      .enum(Object.values(CourseLevel) as [string, ...string[]])
      .optional(),
    category: z.string().trim().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field must be provided to update the course",
  });

const ALLOWED_IMAGE_FILE_TYPES = ["image/jpeg", "image/png"] as const;

export const uploadCourseThumbnailSchema = z.object({
  fileName: z.string().trim().min(1, { error: "File name is required" }),
  fileType: z.enum(ALLOWED_IMAGE_FILE_TYPES, {
    error: "Thumbnail must be a JPEG or PNG image",
  }),
});

const ALLOWED_VIDEO_FILE_TYPES = ["video/mp4", "video/webm"] as const;

export const uploadCourseVideoSchema = z.object({
  fileName: z.string().trim().min(1, { error: "File name is required" }),
  fileType: z.enum(ALLOWED_VIDEO_FILE_TYPES, {
    error: "Video must be an MP4 or WebM file",
  }),
});

export const getCoursesQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  projection: z.string().trim().min(1).optional(),
  instructor: z.string().trim().min(1).optional(),
  isVerified: z
    .enum(["true", "false"], { error: "isVerified must be true or false" })
    .transform((val) => val === "true")
    .optional(),
  verificationRejectionReason: z
    .literal("null", { error: "verificationRejectionReason must be null" })
    .transform(() => null)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
  sortBy: z.string().trim().min(1).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
