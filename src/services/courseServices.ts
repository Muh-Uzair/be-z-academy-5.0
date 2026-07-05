import { PipelineStage, Types } from "mongoose";
import { randomUUID } from "crypto";
import CourseModel from "@src/models/courseModel";
import AppError from "@src/utils/appError";
import {
  getPresignedPutUrlService,
  getPresignedPostUrlService,
} from "@src/services/s3Services";

const MAX_VIDEO_SIZE_IN_BYTES = 20 * 1024 * 1024; // 20MB
import {
  CreateCourseBody,
  UpdateCourseBody,
  UploadCourseThumbnailBody,
  UploadCourseVideoBody,
  GetCoursesQuery,
} from "@src/types/courseTypes";

const buildSlug = (title: string): string => {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${base}-${randomUUID().slice(0, 8)}`;
};

export const getCourseThumbnailUploadUrlService = async (
  body: UploadCourseThumbnailBody,
): Promise<any> => {
  const key = `5.0/courses/thumbnails/${randomUUID()}-${body.fileName}`;

  return getPresignedPutUrlService(key, body.fileType);
};

export const getCourseVideoUploadUrlService = async (
  body: UploadCourseVideoBody,
): Promise<any> => {
  const key = `5.0/courses/videos/${randomUUID()}-${body.fileName}`;

  return getPresignedPostUrlService(
    key,
    body.fileType,
    MAX_VIDEO_SIZE_IN_BYTES,
  );
};

export const createCourseService = async (
  instructorId: string,
  body: CreateCourseBody,
): Promise<any> => {

    
  const course = await CourseModel.create({
    ...body,
    instructor: instructorId,
    slug: buildSlug(body.title),
  });

  return course;
};

export const getInstructorCoursesService = async (
  instructorId: string,
  query: GetCoursesQuery,
): Promise<any> => {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        instructor: new Types.ObjectId(instructorId),
      },
    },
  ];

  if (typeof query.isVerified === "boolean") {
    pipeline.push({ $match: { isVerified: query.isVerified } });
  }

  if (query.search) {
    pipeline.push({
      $match: {
        title: { $regex: query.search, $options: "i" },
      },
    });
  }

  const countPipeline: PipelineStage[] = [...pipeline, { $count: "total" }];

  pipeline.push({ $sort: { createdAt: -1 } });
  pipeline.push({ $skip: (query.page - 1) * query.limit });
  pipeline.push({ $limit: query.limit });

  const [courses, countResult] = await Promise.all([
    CourseModel.aggregate(pipeline),
    CourseModel.aggregate(countPipeline),
  ]);

  const totalDocuments = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(totalDocuments / query.limit);

  return {
    courses,
    pagination: {
      page: query.page,
      limit: query.limit,
      totalDocuments,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPrevPage: query.page > 1,
    },
  };
};

const getOwnedCourseOrThrow = async (id: string, instructorId: string) => {
  const course = await CourseModel.findById(id);

  if (!course) {
    throw new AppError(404, "Course not found");
  }

  if (course.instructor.toString() !== instructorId) {
    throw new AppError(403, "You do not have permission to access this course");
  }

  return course;
};

export const getInstructorCourseByIdService = async (
  id: string,
  instructorId: string,
): Promise<any> => {
  return getOwnedCourseOrThrow(id, instructorId);
};

export const updateInstructorCourseService = async (
  id: string,
  instructorId: string,
  body: UpdateCourseBody,
): Promise<any> => {
  await getOwnedCourseOrThrow(id, instructorId);

  const updatedCourse = await CourseModel.findByIdAndUpdate(id, body, {
    new: true,
    runValidators: true,
  });

  return updatedCourse;
};

export const deleteInstructorCourseService = async (
  id: string,
  instructorId: string,
): Promise<any> => {
  const course = await getOwnedCourseOrThrow(id, instructorId);

  await course.deleteOne();

  return null;
};
