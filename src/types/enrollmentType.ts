import { z } from "zod";
import {
  enrollmentIdParamsSchema,
  getEnrollmentsQuerySchema,
  updateEnrollmentProgressBodySchema,
} from "../validations/enrollmentValidation";

export type EnrollmentIdParams = z.infer<typeof enrollmentIdParamsSchema>;
export type GetEnrollmentsQuery = z.infer<typeof getEnrollmentsQuerySchema>;
export type UpdateEnrollmentProgressBody = z.infer<
  typeof updateEnrollmentProgressBodySchema
>;
