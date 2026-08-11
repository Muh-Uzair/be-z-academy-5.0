import { Request, Response } from "express";
import catchAsync from "@src/utils/catchAsync";
import {
  createReviewService,
  getReviewsService,
  getReviewDetailsService,
  updateReviewService,
  deleteReviewService,
} from "@src/services/reviewService";
import {
  CreateReviewBody,
  UpdateReviewBody,
  GetReviewsQuery,
  ReviewIdParams,
} from "@src/types/reviewType";
import sendResponse from "@src/utils/sendResponse";
import { getCache, setCache, deleteCache, deleteCacheByPattern } from "@src/utils/cache";

export const createReview = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.user!;
    const body = req.validatedBody as CreateReviewBody;

    const review = await createReviewService(id, body);

    await deleteCacheByPattern("reviews:*");

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

    const cacheKey = `reviews:${JSON.stringify(query)}`;

    const cached = await getCache<{ reviews: unknown; pagination: unknown }>(cacheKey);

    if (cached) {
      sendResponse(res, 200, {
        status: "success",
        message: "Reviews fetched successfully",
        data: cached,
      });
      return;
    }

    const { reviews, pagination } = await getReviewsService(query);

    await setCache(cacheKey, { reviews, pagination });

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

    const cacheKey = `reviewDetails:${id}`;

    const cachedReview = await getCache<unknown>(cacheKey);

    if (cachedReview) {
      sendResponse(res, 200, {
        status: "success",
        message: "Review details fetched successfully",
        data: { review: cachedReview },
      });
      return;
    }

    const review = await getReviewDetailsService(id);

    await setCache(cacheKey, review);

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

    await deleteCacheByPattern("reviews:*");
    await deleteCache(`reviewDetails:${id}`);

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

    await deleteCacheByPattern("reviews:*");
    await deleteCache(`reviewDetails:${id}`);

    sendResponse(res, 200, {
      status: "success",
      message: "Review deleted successfully",
      data: null,
    });
  },
);
