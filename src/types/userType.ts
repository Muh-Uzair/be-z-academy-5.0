import { z } from "zod";
import {
  getInstructorsQuerySchema,
  getStudentsQuerySchema,
  userIdParamsSchema,
  updateUserVerificationSchema,
  updateProfileSchema,
  userRoleQuerySchema,
} from "../validations/userValidation";

export type GetInstructorsQuery = z.infer<typeof getInstructorsQuerySchema>;
export type GetStudentsQuery = z.infer<typeof getStudentsQuerySchema>;
export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type UpdateUserVerificationBody = z.infer<
  typeof updateUserVerificationSchema
>;
export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
export type UserRoleQuery = z.infer<typeof userRoleQuerySchema>;

