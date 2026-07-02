import { z } from "zod";
import {
  getInstructorsQuerySchema,
  instructorIdParamsSchema,
  updateInstructorVerificationSchema,
} from "@src/validations/userValidations";

export type GetInstructorsQuery = z.infer<typeof getInstructorsQuerySchema>;
export type InstructorIdParams = z.infer<typeof instructorIdParamsSchema>;
export type UpdateInstructorVerificationBody = z.infer<
  typeof updateInstructorVerificationSchema
>;
