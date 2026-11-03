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

// DIVIDER Admin Routes ---------------------------------------------------------

// DIVIDER Instructor Routes ---------------------------------------------------------

// DIVIDER Student Routes ---------------------------------------------------------

// DIVIDER Admin + Instructor + Student Routes ---------------------------------------------------------

// (root)/api/v1/transactions
// Api # 1
transactionRouter.get(
  "/",
  protect,
  validation(getTransactionsQuerySchema, "query"),
  getTransactions,
);

// (root)/api/v1/transactions/:id
// Api # 2
transactionRouter.get(
  "/:id",
  protect,
  validation(transactionIdParamsSchema, "params"),
  getTransactionDetails,
);

// DIVIDER Admin + Instructor Routes ---------------------------------------------------------

// DIVIDER Admin + Student Routes ---------------------------------------------------------

// DIVIDER Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Public Routes ---------------------------------------------------------

export default transactionRouter;
