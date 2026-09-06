import { HydratedDocument } from "mongoose";
import ReviewModel, { ReviewType } from "../models/reviewModel";
import AppError from "./appError";
import { Role } from "../models/userModel";

export const getReviewOrThrow = async (
  id: string,
): Promise<HydratedDocument<ReviewType>> => {
  const review = await ReviewModel.findById(id);
  if (!review) {
    throw new AppError(404, "Review not found");
  }
  return review;
};

export const verifyReviewOwnershipOrThrow = (
  review: HydratedDocument<ReviewType>,
  studentId: string,
): void => {
  if (review.reviewBy.toString() !== studentId) {
    throw new AppError(403, "You do not have permission to modify this review");
  }
};

export const verifyReviewDeletePermissionOrThrow = (
  review: HydratedDocument<ReviewType>,
  user: { id: string; role: string },
): void => {
  const isOwner = review.reviewBy.toString() === user.id;
  const isAdmin = user.role === Role.Admin;
  if (!isOwner && !isAdmin) {
    throw new AppError(403, "You do not have permission to delete this review");
  }
};
