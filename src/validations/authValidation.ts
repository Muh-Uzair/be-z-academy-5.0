import { z } from "zod";
import {
  USER_FULL_NAME_MIN_LENGTH,
  USER_FULL_NAME_MAX_LENGTH,
  USER_PASSWORD_MIN_LENGTH,
  USER_BIO_MAX_LENGTH,
  USER_HIGHEST_EDUCATION_MAX_LENGTH,
  USER_YEARS_OF_EXPERIENCE_MIN,
  USER_YEARS_OF_EXPERIENCE_MAX,
} from "../constants/userConstant";

const baseSignupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(USER_FULL_NAME_MIN_LENGTH, {
      error: `Full name must be at least ${USER_FULL_NAME_MIN_LENGTH} characters`,
    })
    .max(USER_FULL_NAME_MAX_LENGTH, {
      error: `Full name cannot exceed ${USER_FULL_NAME_MAX_LENGTH} characters`,
    }),
  email: z.email({ error: "Invalid email address" }),
  password: z.string().min(USER_PASSWORD_MIN_LENGTH, {
    error: `Password must be at least ${USER_PASSWORD_MIN_LENGTH} characters`,
  }),
  bio: z
    .string()
    .trim()
    .min(1, { error: "Bio is required" })
    .max(USER_BIO_MAX_LENGTH, {
      error: `Bio cannot exceed ${USER_BIO_MAX_LENGTH} characters`,
    }),
  highestEducation: z
    .string()
    .trim()
    .min(1, { error: "Highest education is required" })
    .max(USER_HIGHEST_EDUCATION_MAX_LENGTH, {
      error: `Highest education cannot exceed ${USER_HIGHEST_EDUCATION_MAX_LENGTH} characters`,
    }),
});

export const studentSignupSchema = baseSignupSchema
  .extend({
    role: z.literal("student"),
  })
  .strict();

export const instructorSignupSchema = baseSignupSchema
  .extend({
    yearsOfExperience: z
      .number({ error: "Years of experience must be a number" })
      .min(USER_YEARS_OF_EXPERIENCE_MIN, {
        error: "Years of experience cannot be negative",
      })
      .max(USER_YEARS_OF_EXPERIENCE_MAX, {
        error: `Years of experience cannot exceed ${USER_YEARS_OF_EXPERIENCE_MAX}`,
      }),
    role: z.literal("instructor"),
  })
  .strict();

export const signupSchema = z.discriminatedUnion("role", [
  studentSignupSchema,
  instructorSignupSchema,
]);

export const verifyOtpSchema = z
  .object({
    email: z.email({ error: "Invalid email address" }),
    otp: z
      .union([z.string(), z.number()])
      .transform((val) => String(val))
      .refine((val) => /^\d{6}$/.test(val), {
        error: "OTP must be a 6 digit number",
      }),
  })
  .strict();

export const resendOtpSchema = z
  .object({
    email: z.email({ error: "Invalid email address" }),
  })
  .strict();

export const signinSchema = z
  .object({
    email: z.email({ error: "Invalid email address" }),
    password: z.string().min(1, { error: "Password is required" }),
  })
  .strict();

export const forgetPasswordSchema = z
  .object({
    email: z.email({ error: "Invalid email address" }),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    otp: z
      .union([z.string(), z.number()])
      .transform((val) => String(val))
      .refine((val) => /^\d{6}$/.test(val), {
        error: "OTP must be a 6 digit number",
      }),
    newPassword: z.string().min(USER_PASSWORD_MIN_LENGTH, {
      error: `Password must be at least ${USER_PASSWORD_MIN_LENGTH} characters`,
    }),
  })
  .strict();
