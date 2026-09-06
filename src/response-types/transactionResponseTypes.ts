// This file is intentionally framework-independent. Copy it directly into a
// frontend project; it has no backend imports and represents JSON values only.

import { SuccessApiResponse, ApiErrorResponse } from "./authResponseTypes";
import { Pagination } from "./userResponseTypes";

export interface TransactionUserSummary {
  _id: string;
  fullName: string;
  email: string;
  avatar: string | null;
}

// Every transaction endpoint joins the raw course document as courseDetails
// without computing thumbnailUrl/videoUrl (that only happens on the course
// endpoints themselves) — thumbnailKey/videoKey are stripped for safety, but
// no image/video URL is available here. Fetch GET /courses/:id separately
// if you need to display the course's thumbnail or video.
export interface TransactionCourseSummary {
  _id: string;
  title: string;
  description: string;
  price: number;
  level: "beginner" | "intermediate" | "advanced";
  instructor: string;
  category: string;
  isVerified: boolean;
  verificationRejectionReason: string | null;
  lastVerificationRejectedAt: string | null;
  averageRating: number;
  totalReviews: number;
  totalStudentsEnrolled: number;
  totalDurationInMinutes: number;
  totalRevenueInstructor: number;
  totalRevenueAdmin: number;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  _id: string;
  transactionId: string;
  stripeChargeId: string | null;
  currency: string;
  studentDetails: TransactionUserSummary;
  courseDetails: TransactionCourseSummary;
  instructorDetails: TransactionUserSummary;
  totalPrice: number;
  amountPaid: number;
  amountPaidAt: string | null;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  adminCommissionPercentage: number;
  adminCommission: number;
  instructorRevenue: number;
  createdAt: string;
  updatedAt: string;
}

// API 1: GET /api/v1/transactions
// Response: { status, message, data: { transactions, pagination } }
export interface GetTransactionsResponseData {
  transactions: Transaction[];
  pagination: Pagination;
}

export type GetTransactionsResponse =
  | SuccessApiResponse<
      GetTransactionsResponseData,
      "Transactions fetched successfully"
    >
  | ApiErrorResponse;

// API 2: GET /api/v1/transactions/:id
// Response: { status, message, data: { transaction } }
export interface GetTransactionDetailsResponseData {
  transaction: Transaction;
}

export type GetTransactionDetailsResponse =
  | SuccessApiResponse<
      GetTransactionDetailsResponseData,
      "Transaction details fetched successfully"
    >
  | ApiErrorResponse;
