import { z } from "zod";
import { Role } from "@src/models/userModel";
import {
  USER_VERIFICATION_REJECTION_REASON_MAX_LENGTH,
  USER_FULL_NAME_MIN_LENGTH,
  USER_FULL_NAME_MAX_LENGTH,
  USER_BIO_MAX_LENGTH,
  USER_HIGHEST_EDUCATION_MAX_LENGTH,
  USER_YEARS_OF_EXPERIENCE_MIN,
  USER_YEARS_OF_EXPERIENCE_MAX,
} from "@src/constants/userConstant";

export const userIdParamsSchema = z.object({
  id: z.string().min(1, { error: "User id is required" }),
});

export const userRoleQuerySchema = z.object({
  role: z.nativeEnum(Role).default(Role.Instructor),
});


export const updateUserVerificationSchema = z
  .object({
    isVerified: z.boolean({ error: "isVerified must be a boolean" }),
    verificationRejectionReason: z
      .string()
      .trim()
      .min(1)
      .max(USER_VERIFICATION_REJECTION_REASON_MAX_LENGTH)
      .nullable()
      .optional(),
  })
  .refine((data) => data.isVerified || !!data.verificationRejectionReason, {
    error: "Rejection reason is required when rejecting a user",
    path: ["verificationRejectionReason"],
  });

export const getInstructorsQuerySchema = z.object({
  isVerified: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  search: z.string().trim().min(1).optional(),
  projection: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
  sortBy: z.string().trim().min(1).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ─── Shared: Update Own Profile ────────────────────────────────────────────────
// Superset of every role's editable fields; userServices.ts strips fields the
// requester's role isn't permitted to change before hitting the database.

export const updateProfileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(USER_FULL_NAME_MIN_LENGTH, {
        error: `Full name must be at least ${USER_FULL_NAME_MIN_LENGTH} characters`,
      })
      .max(USER_FULL_NAME_MAX_LENGTH, {
        error: `Full name cannot exceed ${USER_FULL_NAME_MAX_LENGTH} characters`,
      })
      .optional(),
    avatar: z.string().trim().min(1).nullable().optional(),
    bio: z
      .string()
      .trim()
      .min(1, { error: "Bio is required" })
      .max(USER_BIO_MAX_LENGTH, {
        error: `Bio cannot exceed ${USER_BIO_MAX_LENGTH} characters`,
      })
      .optional(),
    highestEducation: z
      .string()
      .trim()
      .min(1, { error: "Highest education is required" })
      .max(USER_HIGHEST_EDUCATION_MAX_LENGTH, {
        error: `Highest education cannot exceed ${USER_HIGHEST_EDUCATION_MAX_LENGTH} characters`,
      })
      .optional(),
    yearsOfExperience: z
      .number({ error: "Years of experience must be a number" })
      .min(USER_YEARS_OF_EXPERIENCE_MIN, {
        error: "Years of experience cannot be negative",
      })
      .max(USER_YEARS_OF_EXPERIENCE_MAX, {
        error: `Years of experience cannot exceed ${USER_YEARS_OF_EXPERIENCE_MAX}`,
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field must be provided to update the profile",
  });
