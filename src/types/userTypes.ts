import { z } from "zod";
import { getInstructorsQuerySchema } from "@src/validations/userValidations";

export type GetInstructorsQuery = z.infer<typeof getInstructorsQuerySchema>;
