import { Router } from "express";
import {
  getTransactions,
  getTransactionDetails,
} from "../controllers/transactionController";
import validation from "../middlewares/validation";
import protect from "../middlewares/protect";
import {
  transactionIdParamsSchema,
  getTransactionsQuerySchema,
} from "../validations/transactionValidation";

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
