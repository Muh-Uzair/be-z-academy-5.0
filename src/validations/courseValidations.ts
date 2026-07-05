import { z } from "zod";
import { CourseLevel } from "@src/models/courseModel";

export const courseIdParamsSchema = z.object({
  id: z.string().min(1, { error: "Course id is required" }),
});

export const createCourseSchema = z.object({
  title: z.string().trim().min(5, { error: "Title is required" }),
  description: z.string().trim().min(20, { error: "Description is required" }),
  price: z.coerce.number().min(0, { error: "Price is required" }),
  level: z.enum(Object.values(CourseLevel) as [string, ...string[]], {
    error: "Level must be one of: beginner, intermediate, advanced",
  }),
  category: z.string().trim().min(1, { error: "Category is required" }),
  thumbnailKey: z.string().trim().min(1, { error: "Thumbnail is required" }),
  videoKey: z.string().trim().min(1, { error: "Video is required" }),
});

export const updateCourseSchema = z
  .object({
    title: z.string().trim().min(5).optional(),
    description: z.string().trim().min(20).optional(),
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
  isVerified: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
});
