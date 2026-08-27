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
} from "@src/controllers/authController";
import validation from "@src/middlewares/validation";
import protect from "@src/middlewares/protect";
import restrictTo from "@src/middlewares/restrictTo";
import { Role } from "@src/models/userModel";
import {
  signupSchema,
  verifyOtpSchema,
  resendOtpSchema,
  signinSchema,
  forgetPasswordSchema,
  resetPasswordSchema,
} from "@src/validations/authValidation";

const authRouter = Router();

authRouter.post("/signup", validation(signupSchema, "body"), signup);
authRouter.post(
  "/verify-otp",
  validation(verifyOtpSchema, "body"),
  restrictTo(Role.Student),
  verifyOtp,
);
authRouter.post(
  "/resend-otp",
  validation(resendOtpSchema, "body"),
  restrictTo(Role.Student),
  resendOtp,
);
authRouter.post("/signin", validation(signinSchema, "body"), signin);
authRouter.post(
  "/forget-password",
  validation(forgetPasswordSchema, "body"),
  forgetPassword,
);
authRouter.post(
  "/reset-password",
  validation(resetPasswordSchema, "body"),
  resetPassword,
);
authRouter.post("/signout", signout);
authRouter.post("/rotate-token", rotateToken);
authRouter.get("/me", protect, getMe);

export default authRouter;
