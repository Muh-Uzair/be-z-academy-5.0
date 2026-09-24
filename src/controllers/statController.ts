import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import { getPlatformStatsService } from "../services/statService";
import sendResponse from "../utils/sendResponse";

export const getPlatformStats = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const stats = await getPlatformStatsService();

    sendResponse(res, 200, {
      status: "success",
      message: "Platform stats fetched successfully",
      data: stats,
    });
  },
);
