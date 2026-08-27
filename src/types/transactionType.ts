import { z } from "zod";
import {
  transactionIdParamsSchema,
  getTransactionsQuerySchema,
} from "../validations/transactionValidation";

export type TransactionIdParams = z.infer<typeof transactionIdParamsSchema>;
export type GetTransactionsQuery = z.infer<typeof getTransactionsQuerySchema>;
