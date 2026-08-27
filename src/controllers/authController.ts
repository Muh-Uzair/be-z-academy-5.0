import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import {
  signupService,
  verifyOtpService,
  resendOtpService,
  signinService,
  rotateTokenService,
  forgetPasswordService,
  resetPasswordService,
} from "../services/authService";
import { getUserDetailsService } from "../services/userService";
import {
  SignupBody,
  VerifyOtpBody,
  ResendOtpBody,
  SigninBody,
  ForgetPasswordBody,
  ResetPasswordBody,
} from "../types/authType";
import { Role } from "../models/userModel";
import sendResponse from "../utils/sendResponse";
import { setAuthCookies, clearAuthCookies } from "../utils/cookie";

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

export const forgetPassword = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.validatedBody as ForgetPasswordBody;

    const data = await forgetPasswordService(body);

    sendResponse(res, 200, {
      status: "success",
      message: "OTP sent successfully, please check your email",
      data,
    });
  },
);

export const resetPassword = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const body = req.validatedBody as ResetPasswordBody;

    const data = await resetPasswordService(body);

    sendResponse(res, 200, {
      status: "success",
      message: "Password reset successfully",
      data,
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

export const signout = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    clearAuthCookies(res);

    sendResponse(res, 200, {
      status: "success",
      message: "Signed out successfully",
      data: null,
    });
  },
);
