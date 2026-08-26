import { Request, Response } from "express";
import catchAsync from "@src/utils/catchAsync";
import {
  signupService,
  verifyOtpService,
  resendOtpService,
  signinService,
  rotateTokenService,
} from "@src/services/authService";
import { getUserDetailsService } from "@src/services/userService";
import {
  SignupBody,
  VerifyOtpBody,
  ResendOtpBody,
  SigninBody,
} from "@src/types/authType";
import { Role } from "@src/models/userModel";
import sendResponse from "@src/utils/sendResponse";
import { setAuthCookies } from "@src/utils/cookie";

export const signup = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    
    const body = req.validatedBody as SignupBody;

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
    const body = req.validatedBody as VerifyOtpBody;

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
    const body = req.validatedBody as ResendOtpBody;

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
    const body = req.validatedBody as SigninBody;

    const { accessToken, refreshToken, user } = await signinService(body);
    setAuthCookies(res, accessToken, refreshToken);

    sendResponse(res, 200, {
      status: "success",
      message: "Signed in successfully",
      data: { user },
    });
  },
);

export const getMe = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id, role } = req.user!;

    const user = await getUserDetailsService(id, role as Role);

    sendResponse(res, 200, {
      status: "success",
      message: "Current user fetched successfully",
      data: { user },
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
