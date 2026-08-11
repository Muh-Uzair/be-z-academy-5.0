import { Request, Response } from "express";
import catchAsync from "@src/utils/catchAsync";
import {
  getTransactionsService,
  getTransactionDetailsService,
} from "@src/services/transactionService";
import {
  GetTransactionsQuery,
  TransactionIdParams,
} from "@src/types/transactionType";
import sendResponse from "@src/utils/sendResponse";
import { getCache, setCache } from "@src/utils/cache";

export const getTransactions = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.validatedQuery as GetTransactionsQuery;
    const { id, role } = req.user!;

    const cacheKey = `transactions:${JSON.stringify(query)}:${role}:${id}`;

    const cached = await getCache<{ transactions: unknown; pagination: unknown }>(cacheKey);

    if (cached) {
      sendResponse(res, 200, {
        status: "success",
        message: "Transactions fetched successfully",
        data: cached,
      });
      return;
    }

    const { transactions, pagination } = await getTransactionsService(query, {
      id,
      role,
    });

    await setCache(cacheKey, { transactions, pagination });

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

    const cacheKey = `transactionDetails:${id}:${role}:${userId}`;

    const cachedTransaction = await getCache<unknown>(cacheKey);

    if (cachedTransaction) {
      sendResponse(res, 200, {
        status: "success",
        message: "Transaction details fetched successfully",
        data: { transaction: cachedTransaction },
      });
      return;
    }

    const transaction = await getTransactionDetailsService(id, {
      id: userId,
      role,
    });

    await setCache(cacheKey, transaction);

    sendResponse(res, 200, {
      status: "success",
      message: "Transaction details fetched successfully",
      data: { transaction },
    });
  },
);
