import { PipelineStage, Types } from "mongoose";
import { randomUUID } from "crypto";
import CourseModel from "@src/models/courseModel";
import AppError from "@src/utils/appError";
import {
  getPresignedPostUrlService,
  getPresignedGetUrlService,
  deleteS3ObjectService,
  buildS3ObjectKey,
} from "@src/services/s3Services";
import {
  CreateCourseBody,
  UpdateCourseBody,
  UploadCourseThumbnailBody,
  UploadCourseVideoBody,
  GetCoursesQuery,
} from "@src/types/courseTypes";

const MAX_VIDEO_SIZE_IN_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024; // 5MB

const buildSlug = (title: string): string => {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${base}-${randomUUID().slice(0, 8)}`;
};

const withSignedVideoUrl = async (course: any): Promise<any> => {
  // Step 1: Convert to a plain object (applies toJSON's thumbnailKey/videoKey cleanup)
  const plain = typeof course.toJSON === "function" ? course.toJSON() : course;

  // Step 2: Read the raw video key from whichever source still has it
  const videoKey = plain.videoKey ?? course.videoKey;

  // Step 3: Sign a time-limited GET URL for the private video
  const videoUrl = await getPresignedGetUrlService(videoKey);

  // Step 4: Strip the raw key and attach the signed URL
  delete plain.videoKey;

  return { ...plain, videoUrl };
};

export const getCourseThumbnailUploadUrlService = async (
  body: UploadCourseThumbnailBody,
): Promise<any> => {
  // Step 1: Build a unique S3 key for the thumbnail, with the correct extension
  const key = buildS3ObjectKey(
    "5.0/courses/thumbnails",
    body.fileName,
    body.fileType,
    randomUUID(),
  );

  // Step 2: Generate a presigned POST policy capped at the max image size
  return getPresignedPostUrlService(key, body.fileType, MAX_IMAGE_SIZE_IN_BYTES);
};

export const getCourseVideoUploadUrlService = async (
  body: UploadCourseVideoBody,
): Promise<any> => {
  // Step 1: Build a unique S3 key for the video, with the correct extension
  const key = buildS3ObjectKey(
    "5.0/courses/videos",
    body.fileName,
    body.fileType,
    randomUUID(),
  );

  // Step 2: Generate a presigned POST policy capped at the max video size
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
  // Step 1: Create the course, tagging the owning instructor and a unique slug
  const course = await CourseModel.create({
    ...body,
    instructor: instructorId,
    slug: buildSlug(body.title),
  });

  // Step 2: Attach a signed video URL before returning
  return withSignedVideoUrl(course);
};

export const getInstructorCoursesService = async (
  instructorId: string,
  query: GetCoursesQuery,
): Promise<any> => {
  // Step 1: Scope the pipeline to the requesting instructor's own courses
  const pipeline: PipelineStage[] = [
    {
      $match: {
        instructor: new Types.ObjectId(instructorId),
      },
    },
  ];

  // Step 2: Apply optional isVerified and search filters
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

  // Step 3: Clone the pipeline for a total count before pagination is applied
  const countPipeline: PipelineStage[] = [...pipeline, { $count: "total" }];

  // Step 4: Apply sorting and pagination to the main pipeline
  pipeline.push({ $sort: { createdAt: -1 } });
  pipeline.push({ $skip: (query.page - 1) * query.limit });
  pipeline.push({ $limit: query.limit });

  // Step 5: Run both pipelines in parallel
  const [courses, countResult] = await Promise.all([
    CourseModel.aggregate(pipeline),
    CourseModel.aggregate(countPipeline),
  ]);

  // Step 6: Compute pagination metadata
  const totalDocuments = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(totalDocuments / query.limit);

  // Step 7: Attach a signed video URL to every course in the page
  const coursesWithVideoUrls = await Promise.all(
    courses.map((course) => withSignedVideoUrl(course)),
  );

  return {
    courses: coursesWithVideoUrls,
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
  // Step 1: Find the course by id
  const course = await CourseModel.findById(id);

  if (!course) {
    throw new AppError(404, "Course not found");
  }

  // Step 2: Ensure the requesting instructor owns this course
  if (course.instructor.toString() !== instructorId) {
    throw new AppError(403, "You do not have permission to access this course");
  }

  return course;
};

export const getInstructorCourseByIdService = async (
  id: string,
  instructorId: string,
): Promise<any> => {
  // Step 1: Fetch the course, enforcing ownership
  const course = await getOwnedCourseOrThrow(id, instructorId);

  // Step 2: Attach a signed video URL before returning
  return withSignedVideoUrl(course);
};

export const updateInstructorCourseService = async (
  id: string,
  instructorId: string,
  body: UpdateCourseBody,
): Promise<any> => {
  // Step 1: Fetch the existing course, enforcing ownership, and capture its current keys
  const existingCourse = await getOwnedCourseOrThrow(id, instructorId);

  const previousThumbnailKey = existingCourse.thumbnailKey;
  const previousVideoKey = existingCourse.videoKey;

  // Step 2: Apply the update
  const updatedCourse = await CourseModel.findByIdAndUpdate(id, body, {
    new: true,
    runValidators: true,
  });

  // Step 3: Collect any S3 keys that were replaced by this update
  const staleKeys: string[] = [];

  if (body.thumbnailKey && body.thumbnailKey !== previousThumbnailKey) {
    staleKeys.push(previousThumbnailKey);
  }

  if (body.videoKey && body.videoKey !== previousVideoKey) {
    staleKeys.push(previousVideoKey);
  }

  // Step 4: Delete the now-orphaned S3 objects
  await Promise.all(staleKeys.map((key) => deleteS3ObjectService(key)));

  // Step 5: Attach a signed video URL before returning
  return withSignedVideoUrl(updatedCourse);
};

export const deleteInstructorCourseService = async (
  id: string,
  instructorId: string,
): Promise<any> => {
  // Step 1: Fetch the course, enforcing ownership
  const course = await getOwnedCourseOrThrow(id, instructorId);

  // Step 2: Delete the course document
  await course.deleteOne();

  // Step 3: Delete the now-orphaned thumbnail and video from S3
  await Promise.all([
    deleteS3ObjectService(course.thumbnailKey),
    deleteS3ObjectService(course.videoKey),
  ]);

  return null;
};
