import { Router } from "express";
import {
  signup,
  verifyOtp,
  resendOtp,
  signin,
  rotateToken,
  getMe,
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
} from "@src/validations/authValidations";

const authRouter = Router();

authRouter.post("/signup", validation(signupSchema), signup);
authRouter.post(
  "/verify-otp",
  validation(verifyOtpSchema),
  restrictTo(Role.Student),
  verifyOtp,
);  
authRouter.post(
  "/resend-otp",
  validation(resendOtpSchema),
  restrictTo(Role.Student),
  resendOtp,
);
authRouter.post("/signin", validation(signinSchema), signin);
authRouter.post("/rotate-token", rotateToken);
authRouter.get("/me", protect, getMe);

export default authRouter;
