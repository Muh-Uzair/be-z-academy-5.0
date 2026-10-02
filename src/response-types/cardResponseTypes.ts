// This file is intentionally framework-independent. Copy it directly into a
// frontend project; it has no backend imports and represents JSON values only.

import { SuccessApiResponse, ApiErrorResponse } from "./authResponseTypes";

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  cardholderName: string | null;
  funding: string | null;
  country: string | null;
  createdAt: string;
}

// API 1: GET /api/v1/cards
export interface GetSavedCardsResponseData {
  cards: SavedCard[];
}

export type GetSavedCardsResponse =
  | SuccessApiResponse<
      GetSavedCardsResponseData,
      "Payment cards fetched successfully"
    >
  | ApiErrorResponse;

// API 2: POST /api/v1/cards/setup-intent
export interface CreateCardSetupIntentResponseData {
  clientSecret: string | null;
}

export type CreateCardSetupIntentResponse =
  | SuccessApiResponse<
      CreateCardSetupIntentResponseData,
      "Card setup intent created successfully"
    >
  | ApiErrorResponse;

// API 3: PATCH /api/v1/cards/:id/default
export type SetDefaultCardResponse =
  | SuccessApiResponse<null, "Default payment card updated successfully">
  | ApiErrorResponse;

// API 4: DELETE /api/v1/cards/:id
export type DeleteSavedCardResponse =
  | SuccessApiResponse<null, "Payment card removed successfully">
  | ApiErrorResponse;
