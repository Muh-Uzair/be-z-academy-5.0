import ReviewModel from "@src/models/reviewModel";
import AppError from "@src/utils/appError";
import { Role } from "@src/models/userModel";

export const getReviewOrThrow = async (id: string) => {
  const review = await ReviewModel.findById(id);
  if (!review) {
    throw new AppError(404, "Review not found");
  }
  return review;
};

export const verifyReviewOwnershipOrThrow = (review: any, studentId: string) => {
  if (review.reviewBy.toString() !== studentId) {
    throw new AppError(403, "You do not have permission to modify this review");
  }
};

export const verifyReviewDeletePermissionOrThrow = (review: any, user: { id: string; role: string }) => {
  const isOwner = review.reviewBy.toString() === user.id;
  const isAdmin = user.role === Role.Admin;
  if (!isOwner && !isAdmin) {
    throw new AppError(403, "You do not have permission to delete this review");
  }
};
