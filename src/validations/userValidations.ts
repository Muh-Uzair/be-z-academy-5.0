import { z } from "zod";
import { USER_VERIFICATION_REJECTION_REASON_MAX_LENGTH } from "@src/constants/userConstants";

export const instructorIdParamsSchema = z.object({
  id: z.string().min(1, { error: "Instructor id is required" }),
});

export const updateInstructorVerificationSchema = z
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
    error: "Rejection reason is required when rejecting an instructor",
    path: ["verificationRejectionReason"],
  });

export const getInstructorsQuerySchema = z.object({
  isVerified: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
});
