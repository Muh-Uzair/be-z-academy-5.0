import { z } from "zod";

export const cardIdParamsSchema = z
  .object({
    id: z.string().trim().min(1, { error: "Card id is required" }),
  })
  .strict();

export type CardIdParams = z.infer<typeof cardIdParamsSchema>;
