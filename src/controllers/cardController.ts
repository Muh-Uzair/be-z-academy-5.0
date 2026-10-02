import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { CardIdParams } from "../validations/cardValidation";
import {
  getSavedCardsService,
  createCardSetupIntentService,
  setDefaultCardService,
  deleteSavedCardService,
} from "../services/cardService";

export const getSavedCards = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const studentId = req.user!.id;
    const data = await getSavedCardsService(studentId);

    sendResponse(res, 200, {
      status: "success",
      message: "Payment cards fetched successfully",
      data,
    });
  },
);

export const createCardSetupIntent = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const studentId = req.user!.id;
    const data = await createCardSetupIntentService(studentId);

    sendResponse(res, 200, {
      status: "success",
      message: "Card setup intent created successfully",
      data,
    });
  },
);

export const setDefaultCard = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const studentId = req.user!.id;
    const { id } = req.validatedParams as CardIdParams;

    await setDefaultCardService(studentId, id);

    sendResponse(res, 200, {
      status: "success",
      message: "Default payment card updated successfully",
      data: null,
    });
  },
);

export const deleteSavedCard = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const studentId = req.user!.id;
    const { id } = req.validatedParams as CardIdParams;

    await deleteSavedCardService(studentId, id);

    sendResponse(res, 200, {
      status: "success",
      message: "Payment card removed successfully",
      data: null,
    });
  },
);
