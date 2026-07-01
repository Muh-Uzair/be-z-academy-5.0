import { z } from "zod";
import {
  signupSchema,
  studentSignupSchema,
  instructorSignupSchema,
  verifyOtpSchema,
  resendOtpSchema,
  signinSchema,
} from "@src/validations/authValidations";

export type SignupBody = z.infer<typeof signupSchema>;
export type StudentSignupBody = z.infer<typeof studentSignupSchema>;
export type InstructorSignupBody = z.infer<typeof instructorSignupSchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;
export type ResendOtpBody = z.infer<typeof resendOtpSchema>;
export type SigninBody = z.infer<typeof signinSchema>;
