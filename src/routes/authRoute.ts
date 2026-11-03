import { Router } from "express";
import {
  signup,
  verifyOtp,
  resendOtp,
  signin,
  rotateToken,
  getMe,
  signout,
  forgetPassword,
  resetPassword,
} from "../controllers/authController";
import validation from "../middlewares/validation";
import protect from "../middlewares/protect";
import restrictTo from "../middlewares/restrictTo";
import { Role } from "../models/userModel";
import {
  signupSchema,
  verifyOtpSchema,
  resendOtpSchema,
  signinSchema,
  forgetPasswordSchema,
  resetPasswordSchema,
} from "../validations/authValidation";

const authRouter = Router();

// DIVIDER Admin Routes ---------------------------------------------------------

// DIVIDER Instructor Routes ---------------------------------------------------------

// DIVIDER Student Routes ---------------------------------------------------------

// (root)/api/v1/auth/verify-otp
authRouter.post(
  "/verify-otp",
  validation(verifyOtpSchema, "body"),
  restrictTo(Role.Student),
  verifyOtp,
);

// (root)/api/v1/auth/resend-otp
authRouter.post(
  "/resend-otp",
  validation(resendOtpSchema, "body"),
  restrictTo(Role.Student),
  resendOtp,
);

// DIVIDER Admin + Instructor + Student Routes ---------------------------------------------------------

// (root)/api/v1/auth/me
authRouter.get("/me", protect, getMe);

// DIVIDER Admin + Instructor Routes ---------------------------------------------------------

// DIVIDER Admin + Student Routes ---------------------------------------------------------

// DIVIDER Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Public Routes ---------------------------------------------------------

// (root)/api/v1/auth/signup
authRouter.post("/signup", validation(signupSchema, "body"), signup);

// (root)/api/v1/auth/signin
authRouter.post("/signin", validation(signinSchema, "body"), signin);

// (root)/api/v1/auth/forget-password
authRouter.post(
  "/forget-password",
  validation(forgetPasswordSchema, "body"),
  forgetPassword,
);

// (root)/api/v1/auth/reset-password
authRouter.post(
  "/reset-password",
  validation(resetPasswordSchema, "body"),
  resetPassword,
);

// (root)/api/v1/auth/signout
authRouter.post("/signout", signout);

// (root)/api/v1/auth/rotate-token
authRouter.post("/rotate-token", rotateToken);

export default authRouter;
