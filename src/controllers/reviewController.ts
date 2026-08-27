import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import {
  createReviewService,
  getReviewsService,
  getReviewDetailsService,
  updateReviewService,
  deleteReviewService,
} from "../services/reviewService";
import {
  CreateReviewBody,
  UpdateReviewBody,
  GetReviewsQuery,
  ReviewIdParams,
} from "../types/reviewType";
import sendResponse from "../utils/sendResponse";

export const createReview = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.user!;
    const body = req.validatedBody as CreateReviewBody;

    const review = await createReviewService(id, body);

    sendResponse(res, 201, {
      status: "success",
      message: "Review created successfully",
      data: { review },
    });
  },
);

export const getReviews = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.validatedQuery as GetReviewsQuery;

    const { reviews, pagination } = await getReviewsService(query);

    sendResponse(res, 200, {
      status: "success",
      message: "Reviews fetched successfully",
      data: { reviews, pagination },
    });
  },
);

export const getReviewDetails = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as ReviewIdParams;

    const review = await getReviewDetailsService(id);

    sendResponse(res, 200, {
      status: "success",
      message: "Review details fetched successfully",
      data: { review },
    });
  },
);

export const updateReview = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as ReviewIdParams;
    const { id: studentId } = req.user!;
    const body = req.validatedBody as UpdateReviewBody;

    const review = await updateReviewService(id, studentId, body);

    sendResponse(res, 200, {
      status: "success",
      message: "Review updated successfully",
      data: { review },
    });
  },
);

export const deleteReview = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as ReviewIdParams;
    const { id: userId, role } = req.user!;

    await deleteReviewService(id, { id: userId, role });

    sendResponse(res, 200, {
      status: "success",
      message: "Review deleted successfully",
      data: null,
    });
  },
);
