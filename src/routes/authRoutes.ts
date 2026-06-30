import { Router } from "express";
import { signup, verifyOtp, resendOtp } from "@src/controllers/authController";
import validationMiddleware from "@src/middlewares/validationMiddleware";
import {
  signupSchema,
  verifyOtpSchema,
  resendOtpSchema,
} from "@src/validations/authValidations";

const authRouter = Router();

authRouter.post("/signup", validationMiddleware(signupSchema), signup);
authRouter.post(
  "/verify-otp",
  validationMiddleware(verifyOtpSchema),
  verifyOtp,
);
authRouter.post(
  "/resend-otp",
  validationMiddleware(resendOtpSchema),
  resendOtp,
);

export default authRouter;
