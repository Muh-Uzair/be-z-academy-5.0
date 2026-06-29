import { Request, Response } from "express";
import catchAsync from "@src/utils/catchAsync";
import { signupService } from "@src/services/authServices";
import { SignupBody } from "@src/types/authTypes";
import sendResponse from "@src/utils/sendResponse";

export const signup = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SignupBody;

    await signupService(body);

    sendResponse(res, 201, {
      status: "success",
      message: "Signup successful",
      data: null,
    });
  },
);
