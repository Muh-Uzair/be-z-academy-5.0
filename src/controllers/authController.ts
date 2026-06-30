import { Request, Response } from "express";
import catchAsync from "@src/utils/catchAsync";
import { signupService, verifyOtpService, resendOtpService } from "@src/services/authServices";
import { SignupBody, VerifyOtpBody, ResendOtpBody } from "@src/types/authTypes";
import sendResponse from "@src/utils/sendResponse";

export const signup = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SignupBody;

    const data = await signupService(body);

    sendResponse(res, 201, {
      status: "success",
      message: "Signup successful, please check your email for the OTP",
      data,
    });
  },
);

export const verifyOtp = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as VerifyOtpBody;

    const data = await verifyOtpService(body);

    sendResponse(res, 200, {
      status: "success",
      message: "Account verified successfully",
      data,
    });
  },
);

export const resendOtp = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ResendOtpBody;

    const data = await resendOtpService(body);

    sendResponse(res, 200, {
      status: "success",
      message: "OTP resent successfully, please check your email",
      data,
    });
  },
);
