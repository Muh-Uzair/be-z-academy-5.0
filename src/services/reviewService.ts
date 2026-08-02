import { PipelineStage, Types } from "mongoose";
import ReviewModel from "@src/models/reviewModel";
import CourseModel from "@src/models/courseModel";
import EnrollmentModel from "@src/models/enrollmentModel";
import AppError from "@src/utils/appError";
import APIFeatures from "@src/utils/apiFeatures";
import {
  CreateReviewBody,
  UpdateReviewBody,
  GetReviewsQuery,
} from "@src/types/reviewType";
import {
  getReviewOrThrow,
  verifyReviewOwnershipOrThrow,
  verifyReviewDeletePermissionOrThrow,
} from "@src/utils/reviewUtil";


// Each reference is joined into a *Details field so the response shape is
// already correct without any post-processing mapper.
// The final $project drops the original ObjectId fields that are superseded
// by the joined documents.
const REVIEW_LOOKUP_STAGES: PipelineStage[] = [
  {
    $lookup: {
      from: "users",
      localField: "reviewBy",
      foreignField: "_id",
      as: "reviewByDetails",
    },
  },
  { $unwind: { path: "$reviewByDetails", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "courses",
      localField: "course",
      foreignField: "_id",
      as: "courseDetails",
    },
  },
  { $unwind: { path: "$courseDetails", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "users",
      localField: "instructor",
      foreignField: "_id",
      as: "instructorDetails",
    },
  },
  { $unwind: { path: "$instructorDetails", preserveNullAndEmptyArrays: true } },
  { $project: { reviewBy: 0, course: 0, instructor: 0 } },
];

// FUNCTION
export const createReviewService = async (
  studentId: string,
  body: CreateReviewBody,
): Promise<any> => {
  // Step 1: Ensure the course exists
  const course = await CourseModel.findById(body.course);
  if (!course) {
    throw new AppError(404, "Course not found");
  }

  // Step 2: Ensure the student is enrolled in this course
  const enrollment = await EnrollmentModel.findOne({
    student: studentId,
    course: body.course,
  });
  if (!enrollment) {
    throw new AppError(
      403,
      "You must be enrolled in this course to review it",
    );
  }

  // Step 3: Ensure the student hasn't already reviewed this course
  const existingReview = await ReviewModel.findOne({
    reviewBy: studentId,
    course: body.course,
  });
  if (existingReview) {
    throw new AppError(400, "You have already reviewed this course");
  }

  // Step 4: Create the review, deriving the instructor from the course
  return ReviewModel.create({
    rating: body.rating,
    feedback: body.feedback,
    reviewBy: studentId,
    course: body.course,
    instructor: course.instructor,
  });
};

// FUNCTION
export const getReviewsService = async (
  query: GetReviewsQuery,
): Promise<any> => {
  // Step 1: Cast the reference id filters to ObjectId, targeting the raw
  // field names so MongoDB can use indexes before any lookups occur.
  const filterQuery = {
    ...query,
    course: query.course ? new Types.ObjectId(query.course) : undefined,
    instructor: query.instructor
      ? new Types.ObjectId(query.instructor)
      : undefined,
    reviewBy: query.reviewBy ? new Types.ObjectId(query.reviewBy) : undefined,
  };

  // Step 2: Layer the query-driven filter, search, sort, lookup, projection, and pagination stages.
  // By calling .addStages() AFTER .filter() and .search(), MongoDB's optimizer can use
  // indexes to dramatically reduce the dataset before performing expensive joins.
  const { data, pagination } = await new APIFeatures(
    ReviewModel,
    filterQuery,
    [],
  )
    .filter(["course", "instructor", "reviewBy", "rating"])
    .search(["feedback"])
    .sort()
    .addStages(REVIEW_LOOKUP_STAGES)
    .projection()
    .paginate()
    .exec();

  return { reviews: data, pagination };
};

// FUNCTION
export const getReviewByIdService = async (id: string): Promise<any> => {
  const pipeline: PipelineStage[] = [
    { $match: { _id: new Types.ObjectId(id) } },
    ...REVIEW_LOOKUP_STAGES,
  ];

  const [review] = await ReviewModel.aggregate(pipeline);

  if (!review) {
    throw new AppError(404, "Review not found");
  }

  return review;
};

// FUNCTION
export const updateReviewService = async (
  id: string,
  studentId: string,
  body: UpdateReviewBody,
): Promise<any> => {
  // Step 1: Fetch the review, enforcing ownership
  const review = await getReviewOrThrow(id);
  verifyReviewOwnershipOrThrow(review, studentId);

  // Step 2: Apply the update
  return ReviewModel.findByIdAndUpdate(id, body, {
    new: true,
    runValidators: true,
  });
};

// FUNCTION
export const deleteReviewService = async (
  id: string,
  user: { id: string; role: string },
): Promise<any> => {
  // Step 1: Fetch the review, enforcing ownership (author or admin)
  const review = await getReviewOrThrow(id);
  verifyReviewDeletePermissionOrThrow(review, user);

  // Step 2: Delete the review document
  await review.deleteOne();

  return null;
};

