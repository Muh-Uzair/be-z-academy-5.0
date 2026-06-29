import { z } from "zod";
import {
  signupSchema,
  studentSignupSchema,
  instructorSignupSchema,
} from "@src/validations/authValidations";

export type SignupBody = z.infer<typeof signupSchema>;
export type StudentSignupBody = z.infer<typeof studentSignupSchema>;
export type InstructorSignupBody = z.infer<typeof instructorSignupSchema>;
