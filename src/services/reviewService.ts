import { HydratedDocument, PipelineStage, Types } from "mongoose";
import ReviewModel, { ReviewType } from "../models/reviewModel";
import CourseModel, { CourseType } from "../models/courseModel";
import EnrollmentModel from "../models/enrollmentModel";
import AppError from "../utils/appError";
import APIFeatures from "../utils/apiFeatures";
import {
  CreateReviewBody,
  UpdateReviewBody,
  GetReviewsQuery,
} from "../types/reviewType";
import { Pagination } from "../utils/sendResponse";
import {
  getReviewOrThrow,
  verifyReviewOwnershipOrThrow,
  verifyReviewDeletePermissionOrThrow,
} from "../utils/reviewUtil";
import { excludeUserFields, excludeCourseInternalFields } from "../utils/lookupProjections";

interface ReviewUserSummary {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  avatar: string | null;
}

type ReviewCourseSummary = Omit<
  CourseType,
  "thumbnailKey" | "videoKey" | "instructor" | "category"
>;

// Shape of each review once REVIEW_LOOKUP_STAGES has joined and replaced
// reviewBy/course/instructor ids with public-safe *Details sub-documents.
export type ReviewListItem = Omit<
  ReviewType,
  "reviewBy" | "course" | "instructor"
> & {
  reviewByDetails: ReviewUserSummary;
  courseDetails: ReviewCourseSummary;
  instructorDetails: ReviewUserSummary;
};

// Each reference is joined into a *Details field so the response shape is
// already correct without any post-processing mapper.
// The final $project drops the original ObjectId fields that are superseded
// by the joined documents, and scrubs sensitive fields that $lookup would
// otherwise pull in from the joined documents unfiltered.
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
  {
    $project: {
      reviewBy: 0,
      course: 0,
      instructor: 0,
      ...excludeUserFields("reviewByDetails"),
      ...excludeUserFields("instructorDetails"),
      ...excludeCourseInternalFields("courseDetails"),
    },
  },
];

// FUNCTION
export const createReviewService = async (
  studentId: string,
  body: CreateReviewBody,
): Promise<HydratedDocument<ReviewType>> => {
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
): Promise<{ reviews: ReviewListItem[]; pagination: Pagination | null }> => {
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

  // The pipeline's $lookup/$project stages reshape each document into
  // ReviewListItem, which APIFeatures' generic Model<ReviewType> can't
  // express — cast once at this boundary.
  return { reviews: data as unknown as ReviewListItem[], pagination };
};

// FUNCTION
export const getReviewDetailsService = async (
  id: string,
): Promise<ReviewListItem> => {
  const pipeline: PipelineStage[] = [
    { $match: { _id: new Types.ObjectId(id) } },
    ...REVIEW_LOOKUP_STAGES,
  ];

  const [review] = (await ReviewModel.aggregate(pipeline)) as ReviewListItem[];

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
): Promise<HydratedDocument<ReviewType>> => {
  // Step 1: Fetch the review, enforcing ownership
  const review = await getReviewOrThrow(id);
  verifyReviewOwnershipOrThrow(review, studentId);

  // Step 2: Apply the update
  const updatedReview = await ReviewModel.findByIdAndUpdate(id, body, {
    new: true,
    runValidators: true,
  });

  return updatedReview!;
};

// FUNCTION
export const deleteReviewService = async (
  id: string,
  user: { id: string; role: string },
): Promise<null> => {
  // Step 1: Fetch the review, enforcing ownership (author or admin)
  const review = await getReviewOrThrow(id);
  verifyReviewDeletePermissionOrThrow(review, user);

  // Step 2: Delete the review document
  await review.deleteOne();

  return null;
};

