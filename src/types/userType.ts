import { z } from "zod";
import {
  getInstructorsQuerySchema,
  userIdParamsSchema,
  updateUserVerificationSchema,
  updateProfileSchema,
  userRoleQuerySchema,
} from "@src/validations/userValidation";

export type GetInstructorsQuery = z.infer<typeof getInstructorsQuerySchema>;
export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type UpdateUserVerificationBody = z.infer<
  typeof updateUserVerificationSchema
>;
export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type UserRoleQuery = z.infer<typeof userRoleQuerySchema>;

