import { randomUUID } from "crypto";
import { Types } from "mongoose";
import CourseModel from "../models/courseModel";
import ReviewModel from "../models/reviewModel";
import AppError from "./appError";

export const buildSlug = (title: string): string => {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${base}-${randomUUID().slice(0, 8)}`;
};

export const getOwnedCourseOrThrow = async (id: string, instructorId: string) => {
  const course = await CourseModel.findById(id);

  if (!course) {
    throw new AppError(404, "Course not found");
  }

  if (course.instructor.toString() !== instructorId) {
    throw new AppError(403, "You do not have permission to access this course");
  }

  return course;
};

// Recomputes averageRating/totalReviews from the Review collection itself
// (rather than incrementing/decrementing on each write), so the course's
// stats stay correct even if a review was ever created/updated/deleted
// outside the normal service flow.
export const recalculateCourseRatingStats = async (
  courseId: string,
): Promise<void> => {
  const [stats] = await ReviewModel.aggregate([
    { $match: { course: new Types.ObjectId(courseId) } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  await CourseModel.updateOne(
    { _id: courseId },
    {
      $set: {
        averageRating: stats ? Math.round(stats.averageRating * 10) / 10 : 0,
        totalReviews: stats ? stats.totalReviews : 0,
      },
    },
  );
};

