import { Request, Response } from "express";
import catchAsync from "@src/utils/catchAsync";
import { getInstructorsService } from "@src/services/userServices";
import { GetInstructorsQuery } from "@src/types/userTypes";
import sendResponse from "@src/utils/sendResponse";

export const getInstructors = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.validatedQuery as GetInstructorsQuery;

    const { instructors, pagination } = await getInstructorsService(query);

    sendResponse(res, 200, {
      status: "success",
      message: "Instructors fetched successfully",
      data: instructors,
      pagination,
    });
  },
);
