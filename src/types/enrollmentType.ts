import { z } from "zod";
import {
  enrollmentIdParamsSchema,
  getEnrollmentsQuerySchema,
} from "@src/validations/enrollmentValidations";

export type EnrollmentIdParams = z.infer<typeof enrollmentIdParamsSchema>;
export type GetEnrollmentsQuery = z.infer<typeof getEnrollmentsQuerySchema>;
