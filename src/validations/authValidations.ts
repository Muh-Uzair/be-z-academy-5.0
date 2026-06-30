import { z } from "zod";

const baseSignupSchema = z.object({
  fullName: z.string().min(1, { error: "Full name is required" }),
  email: z.email({ error: "Invalid email address" }),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters" }),
  bio: z.string().optional(),
  highestEducation: z
    .string()
    .min(1, { error: "Highest education is required" }),
});

export const studentSignupSchema = baseSignupSchema.extend({
  role: z.literal("student"),
});

export const instructorSignupSchema = baseSignupSchema.extend({
  yearsOfExperience: z
    .number({ error: "Years of experience must be a number" })
    .min(0, { error: "Years of experience cannot be negative" }),
  role: z.literal("instructor"),
});

export const signupSchema = z.discriminatedUnion("role", [
  studentSignupSchema,
  instructorSignupSchema,
]);

export const verifyOtpSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  otp: z
    .union([z.string(), z.number()])
    .transform((val) => String(val))
    .refine((val) => /^\d{6}$/.test(val), {
      message: "OTP must be a 6 digit number",
    }),
});

export const resendOtpSchema = z.object({
  email: z.email({ message: "Invalid email address" }),
});
