import { Router } from "express";
import {
  signup,
  verifyOtp,
  resendOtp,
  signin,
  rotateToken,
  getMe,
} from "@src/controllers/authController";
import validationMiddleware from "@src/middlewares/validationMiddleware";
import protectMiddleware from "@src/middlewares/protectMiddleware";
import restrictToMiddleware from "@src/middlewares/restrictToMiddleware";
import { Role } from "@src/models/userModel";
import {
  signupSchema,
  verifyOtpSchema,
  resendOtpSchema,
  signinSchema,
} from "@src/validations/authValidations";

const authRouter = Router();

authRouter.post("/signup", validationMiddleware(signupSchema), signup);
authRouter.post(
  "/verify-otp",
  validationMiddleware(verifyOtpSchema),
  restrictToMiddleware(Role.Student),
  verifyOtp,
);  
authRouter.post(
  "/resend-otp",
  validationMiddleware(resendOtpSchema),
  restrictToMiddleware(Role.Student),
  resendOtp,
);
authRouter.post("/signin", validationMiddleware(signinSchema), signin);
authRouter.post("/rotate-token", rotateToken);
authRouter.get("/me", protectMiddleware, getMe);

export default authRouter;
