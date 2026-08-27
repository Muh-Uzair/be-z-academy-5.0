import { z } from "zod";
import {
  enrollmentIdParamsSchema,
  getEnrollmentsQuerySchema,
} from "../validations/enrollmentValidation";

export type EnrollmentIdParams = z.infer<typeof enrollmentIdParamsSchema>;
export type GetEnrollmentsQuery = z.infer<typeof getEnrollmentsQuerySchema>;
