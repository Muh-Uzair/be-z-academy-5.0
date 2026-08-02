import { Request, Response } from "express";
import catchAsync from "@src/utils/catchAsync";
import {
  getTransactionsService,
  getTransactionByIdService,
} from "@src/services/transactionService";
import {
  GetTransactionsQuery,
  TransactionIdParams,
} from "@src/types/transactionType";
import sendResponse from "@src/utils/sendResponse";

export const getTransactions = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.validatedQuery as GetTransactionsQuery;
    const { id, role } = req.user!;

    const { transactions, pagination } = await getTransactionsService(query, {
      id,
      role,
    });

    sendResponse(res, 200, {
      status: "success",
      message: "Transactions fetched successfully",
      data: { transactions, pagination },
    });
  },
);

export const getTransactionDetails = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.validatedParams as TransactionIdParams;
    const { id: userId, role } = req.user!;

    const transaction = await getTransactionByIdService(id, {
      id: userId,
      role,
    });

    sendResponse(res, 200, {
      status: "success",
      message: "Transaction details fetched successfully",
      data: { transaction },
    });
  },
);
