import { Request, Response } from "express";
import catchAsync from "@src/utils/catchAsync";
import {
  signupService,
  verifyOtpService,
  resendOtpService,
  signinService,
  rotateTokenService,
} from "@src/services/authServices";
import { SignupBody, VerifyOtpBody, ResendOtpBody, SigninBody } from "@src/types/authTypes";
import sendResponse from "@src/utils/sendResponse";
import { setAuthCookies } from "@src/utils/cookies";

export const  signup = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SignupBody;

    const data = await signupService(body);

    const message =
      body.role === "instructor"
        ? "Signup successful, your account will be reviewed by an Admin before you can sign in"
        : "Signup successful, please check your email for the OTP";

    sendResponse(res, 201, {
      status: "success",
      message,
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

export const signin = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SigninBody;

    const { accessToken, refreshToken } = await signinService(body);
    setAuthCookies(res, accessToken, refreshToken);

    sendResponse(res, 200, {
      status: "success",
      message: "Signed in successfully",
      data: null,
    });
  },
);

export const rotateToken = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies?.refreshToken as string | undefined;

    const { accessToken, refreshToken: newRefreshToken } =
      await rotateTokenService(refreshToken);
    setAuthCookies(res, accessToken, newRefreshToken);

    sendResponse(res, 200, {
      status: "success",
      message: "Token rotated successfully",
      data: null,
    });
  },
);
