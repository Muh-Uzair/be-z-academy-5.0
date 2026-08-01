import { Router } from "express";
import {
  getTransactions,
  getTransactionDetails,
} from "@src/controllers/transactionController";
import validation from "@src/middlewares/validation";
import protect from "@src/middlewares/protect";
import {
  transactionIdParamsSchema,
  getTransactionsQuerySchema,
} from "@src/validations/transactionValidations";

const transactionRouter = Router();

transactionRouter.get(
  "/",
  protect,
  validation(getTransactionsQuerySchema, "query"),
  getTransactions,
);

transactionRouter.get(
  "/:id",
  protect,
  validation(transactionIdParamsSchema, "params"),
  getTransactionDetails,
);

export default transactionRouter;
