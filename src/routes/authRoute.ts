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
// Api # 1
authRouter.post(
  "/verify-otp",
  validation(verifyOtpSchema, "body"),
  restrictTo(Role.Student),
  verifyOtp,
);

// (root)/api/v1/auth/resend-otp
// Api # 2
authRouter.post(
  "/resend-otp",
  validation(resendOtpSchema, "body"),
  restrictTo(Role.Student),
  resendOtp,
);

// DIVIDER Admin + Instructor + Student Routes ---------------------------------------------------------

// (root)/api/v1/auth/me
// Api # 3
authRouter.get("/me", protect, getMe);

// DIVIDER Admin + Instructor Routes ---------------------------------------------------------

// DIVIDER Admin + Student Routes ---------------------------------------------------------

// DIVIDER Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Public Routes ---------------------------------------------------------

// (root)/api/v1/auth/signup
// Api # 4
authRouter.post("/signup", validation(signupSchema, "body"), signup);

// (root)/api/v1/auth/signin
// Api # 5
authRouter.post("/signin", validation(signinSchema, "body"), signin);

// (root)/api/v1/auth/forget-password
// Api # 6
authRouter.post(
  "/forget-password",
  validation(forgetPasswordSchema, "body"),
  forgetPassword,
);

// (root)/api/v1/auth/reset-password
// Api # 7
authRouter.post(
  "/reset-password",
  validation(resetPasswordSchema, "body"),
  resetPassword,
);

// (root)/api/v1/auth/signout
// Api # 8
authRouter.post("/signout", signout);

// (root)/api/v1/auth/rotate-token
// Api # 9
authRouter.post("/rotate-token", rotateToken);

export default authRouter;
