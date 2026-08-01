import { z } from "zod";
import {
  getInstructorsQuerySchema,
  instructorIdParamsSchema,
  updateInstructorVerificationSchema,
  updateProfileSchema,
} from "@src/validations/userValidations";

export type GetInstructorsQuery = z.infer<typeof getInstructorsQuerySchema>;
export type InstructorIdParams = z.infer<typeof instructorIdParamsSchema>;
export type UpdateInstructorVerificationBody = z.infer<
  typeof updateInstructorVerificationSchema
>;
export type UpdateProfileBody = z.infer<typeof updateProfileSchema>;
