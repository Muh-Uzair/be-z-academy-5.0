import { PipelineStage, Types } from "mongoose";
import { randomUUID } from "crypto";
import CourseModel from "@src/models/courseModel";
import { Role } from "@src/models/userModel";
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
  UpdateCourseVerificationBody,
  UploadCourseThumbnailBody,
  UploadCourseVideoBody,
  GetCoursesQuery,
} from "@src/types/courseTypes";
import {
  COURSE_MAX_VIDEO_SIZE_IN_BYTES,
  COURSE_MAX_IMAGE_SIZE_IN_BYTES,
  COURSE_THUMBNAIL_S3_FOLDER,
  COURSE_VIDEO_S3_FOLDER,
} from "@src/constants/courseConstants";
import { buildSlug } from "@src/utils/courseUtils";

// FUNCTION
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

// FUNCTION
export const getCourseThumbnailUploadUrlService = async (
  body: UploadCourseThumbnailBody,
): Promise<any> => {
  // Step 1: Build a unique S3 key for the thumbnail, with the correct extension
  const key = buildS3ObjectKey(
    COURSE_THUMBNAIL_S3_FOLDER,
    body.fileName,
    body.fileType,
    randomUUID(),
  );

  // Step 2: Generate a presigned POST policy capped at the max image size
  return getPresignedPostUrlService(
    key,
    body.fileType,
    COURSE_MAX_IMAGE_SIZE_IN_BYTES,
  );
};

// FUNCTION
export const getCourseVideoUploadUrlService = async (
  body: UploadCourseVideoBody,
): Promise<any> => {
  // Step 1: Build a unique S3 key for the video, with the correct extension
  const key = buildS3ObjectKey(
    COURSE_VIDEO_S3_FOLDER,
    body.fileName,
    body.fileType,
    randomUUID(),
  );

  // Step 2: Generate a presigned POST policy capped at the max video size
  return getPresignedPostUrlService(
    key,
    body.fileType,
    COURSE_MAX_VIDEO_SIZE_IN_BYTES,
  );
};

// FUNCTION
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

// FUNCTION
export const getCoursesService = async (
  query: GetCoursesQuery,
  user?: { id: string; role: string },
): Promise<any> => {
  // Step 1: Build the pipeline
  const pipeline: PipelineStage[] = [
    {
      $match: {},
    },
  ];

  // Step 2 : Deal with roles
  const role = user?.role;

  // making changes according to admin
  if (role && role === Role.Admin && user.id) {
    console.log("Admin accessing courses");
  }

  // making changes according to instructor
  if (role && role === Role.Instructor && user.id) {
    pipeline.push({
      $match: {
        instructor: new Types.ObjectId(user.id),
      },
    });
  }

  // making changes according to student
  if (role && role === Role.Student && user.id) {
    pipeline.push({
      $match: { isVerified: true, verificationRejectionReason: null },
    });
  }

  // making changes according to unauthenticated users
  if (!role) {
    pipeline.push({
      $match: { isVerified: true, verificationRejectionReason: null },
    });
  }

  // Step 3: Apply optional isVerified and search filters
  if (typeof query.isVerified === "boolean") {
    pipeline.push({ $match: { isVerified: query.isVerified } });
  }

  // Step 4 : Apply optional verificationRejectionReason filter
  if (query.verificationRejectionReason === null) {
    pipeline.push({
      $match: {
        verificationRejectionReason: null,
      },
    });
  }

  // Step 5: Lookup the category details and unwind the result
  pipeline.push(
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "categoryDetails",
      },
    },
    {
      $unwind: {
        path: "$category",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        category: 0,
      },
    },
  );

  // Step 6: Apply optional search filter on the title
  if (query.search) {
    pipeline.push({
      $match: {
        title: { $regex: query.search, $options: "i" },
      },
    });
  }

  // Step 7: Clone the pipeline for a total count before pagination is applied
  const countPipeline: PipelineStage[] = [...pipeline, { $count: "total" }];

  // Step 8: Apply sorting and pagination to the main pipeline
  pipeline.push({ $sort: { createdAt: -1 } });
  pipeline.push({ $skip: (query.page - 1) * query.limit });
  pipeline.push({ $limit: query.limit });

  // console.log("pipeline ------------------------------------- \n", pipeline);

  // Step 9: Run both pipelines in parallel
  const [courses, countResult] = await Promise.all([
    CourseModel.aggregate(pipeline),
    CourseModel.aggregate(countPipeline),
  ]);

  // Step 10: Compute pagination metadata
  const totalDocuments = countResult[0]?.total ?? 0;
  const totalPages = Math.ceil(totalDocuments / query.limit);

  // Step 11: Attach a signed video URL to every course in the page
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

// FUNCTION
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

// FUNCTION
export const getCourseByIdService = async (id: string): Promise<any> => {
  // Step 1: Fetch the course by id
  const course = await CourseModel.findById(id);

  if (!course) {
    throw new AppError(404, "Course not found");
  }

  // Step 2: Attach a signed video URL before returning
  return withSignedVideoUrl(course);
};

// FUNCTION
export const updateCourseService = async (
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

// FUNCTION
export const updateCourseVerificationService = async (
  id: string,
  body: UpdateCourseVerificationBody,
): Promise<any> => {
  // Step 1: Ensure the course exists
  const course = await CourseModel.findById(id);
  if (!course) {
    throw new AppError(404, "Course not found");
  }

  // Step 2: Guard against redundant verify/unverify calls
  if (course.isVerified === body.isVerified) {
    const message = body.isVerified
      ? "Course is already verified"
      : "Course is already unverified";
    throw new AppError(400, message);
  }

  // Step 3: Update the course, tracking the rejection timestamp when rejecting
  const updatedCourse = await CourseModel.findByIdAndUpdate(
    id,
    {
      ...body,
      ...(body.isVerified ? {} : { lastVerificationRejectedAt: new Date() }),
    },
    { new: true, runValidators: true },
  );

  // Step 4: Attach a signed video URL before returning
  return withSignedVideoUrl(updatedCourse);
};

// FUNCTION
export const deleteCourseService = async (
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
