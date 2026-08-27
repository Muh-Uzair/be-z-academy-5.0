import { randomUUID } from "crypto";
import CourseModel from "../models/courseModel";
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

