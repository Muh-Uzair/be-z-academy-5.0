import { z } from "zod";
import {
  signupSchema,
  studentSignupSchema,
  instructorSignupSchema,
  verifyOtpSchema,
  resendOtpSchema,
  signinSchema,
  forgetPasswordSchema,
  resetPasswordSchema,
} from "@src/validations/authValidation";

export type SignupBody = z.infer<typeof signupSchema>;
export type StudentSignupBody = z.infer<typeof studentSignupSchema>;
export type InstructorSignupBody = z.infer<typeof instructorSignupSchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;
export type ResendOtpBody = z.infer<typeof resendOtpSchema>;
export type SigninBody = z.infer<typeof signinSchema>;
export type ForgetPasswordBody = z.infer<typeof forgetPasswordSchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
