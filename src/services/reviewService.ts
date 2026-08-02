import { PipelineStage, Types } from "mongoose";
import ReviewModel from "@src/models/reviewModel";
import CourseModel from "@src/models/courseModel";
import EnrollmentModel from "@src/models/enrollmentModel";
import { Role } from "@src/models/userModel";
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


// Every reference is joined in place (lookup `as` reuses the original field
// name), so the raw ObjectId is replaced with the nested document at that
// same key. This is what lets query filters target e.g. "course._id".
const REVIEW_LOOKUP_STAGES: PipelineStage[] = [
  {
    $lookup: {
      from: "users",
      localField: "reviewBy",
      foreignField: "_id",
      as: "reviewBy",
    },
  },
  { $unwind: { path: "$reviewBy", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "courses",
      localField: "course",
      foreignField: "_id",
      as: "course",
    },
  },
  { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "users",
      localField: "instructor",
      foreignField: "_id",
      as: "instructor",
    },
  },
  { $unwind: { path: "$instructor", preserveNullAndEmptyArrays: true } },
];

// Renames the now-joined reference fields to *Details for the response, so
// callers get e.g. courseDetails: {} instead of course: "<mongo id>".
const toReviewDetails = (doc: any) => {
  const { reviewBy, course, instructor, ...rest } = doc;
  return {
    ...rest,
    reviewByDetails: reviewBy,
    courseDetails: course,
    instructorDetails: instructor,
  };
};

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
  // Step 1: The reference filters need ObjectId casting. Since the base
  // pipeline joins them in place under the same field name, they must be
  // matched by their nested _id rather than the (now-gone) raw id field.
  const filterQuery = {
    ...query,
    "course._id": query.course ? new Types.ObjectId(query.course) : undefined,
    "instructor._id": query.instructor
      ? new Types.ObjectId(query.instructor)
      : undefined,
    "reviewBy._id": query.reviewBy
      ? new Types.ObjectId(query.reviewBy)
      : undefined,
  };

  const basePipeline: PipelineStage[] = [...REVIEW_LOOKUP_STAGES];

  // Step 2: Layer the query-driven filter, search, sort, projection and pagination stages
  const { data, pagination } = await new APIFeatures(
    ReviewModel,
    filterQuery,
    basePipeline,
  )
    .filter(["course._id", "instructor._id", "reviewBy._id", "rating"])
    .search(["feedback"])
    .sort()
    .projection()
    .paginate()
    .exec();

  return { reviews: data.map(toReviewDetails), pagination };
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

  return toReviewDetails(review);
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

