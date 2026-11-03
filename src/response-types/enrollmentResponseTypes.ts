// This file is intentionally framework-independent. Copy it directly into a
// frontend project; it has no backend imports and represents JSON values only.

import { AuthUser, SuccessApiResponse, ApiErrorResponse } from "./authResponseTypes";
import { Pagination } from "./userResponseTypes";

// The joined student/instructor: the same public user fields as AuthUser
// (stripeOnboardingComplete is never included here).
export type EnrollmentUserSummary = Omit<AuthUser, "stripeOnboardingComplete">;

export interface EnrollmentCourseSummary {
  _id: string;
  title: string;
  description: string;
  price: number;
  level: "beginner" | "intermediate" | "advanced";
  thumbnailUrl: string;
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

export interface EnrollmentTransactionSummary {
  _id: string;
  transactionId: string;
  stripeChargeId: string | null;
  currency: string;
  student: string;
  course: string;
  isCourseDeleted: boolean;
  courseDetails: null;
  instructor: string;
  totalPrice: number;
  amountPaid: number;
  amountPaidAt: string | null;
  paymentStatus: "pending" | "paid" | "failed" | "refund_processing" | "refunded";
  adminCommissionPercentage: number;
  adminCommission: number;
  instructorRevenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  _id: string;
  studentDetails: EnrollmentUserSummary;
  courseDetails: EnrollmentCourseSummary;
  instructorDetails: EnrollmentUserSummary;
  transactionDetails: EnrollmentTransactionSummary;
  enrolledAt: string;
  totalDurationWatchedInMinutes: number;
  watchPercentage: number;
  watchedCompletely: boolean;
  watchedCompletelyAt: string | null;
  mostRecentlySeen: boolean;
  certificateIssued: boolean;
  certificateIssuedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Query parameters for API 1. For a student, continueWatching=true returns
// only started enrollments (watchPercentage > 0, completed ones included),
// most recently seen first.
export interface GetEnrollmentsQueryParams {
  student?: string;
  course?: string;
  instructor?: string;
  transaction?: string;
  watchedCompletely?: "true" | "false";
  continueWatching?: "true" | "false";
  certificateIssued?: "true" | "false";
  projection?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// API 1: GET /api/v1/enrollments
// Response: { status, message, data: { enrollments, pagination } }
export interface GetEnrollmentsResponseData {
  enrollments: Enrollment[];
  pagination: Pagination;
}

export type GetEnrollmentsResponse =
  | SuccessApiResponse<
      GetEnrollmentsResponseData,
      "Enrollments fetched successfully"
    >
  | ApiErrorResponse;

// API 2: GET /api/v1/enrollments/:id
// Response: { status, message, data: { enrollment } }
export interface GetEnrollmentDetailsResponseData {
  enrollment: Enrollment;
}

export type GetEnrollmentDetailsResponse =
  | SuccessApiResponse<
      GetEnrollmentDetailsResponseData,
      "Enrollment details fetched successfully"
    >
  | ApiErrorResponse;

// API 3: PATCH /api/v1/enrollments/:id/progress
// Body: { lastPositionInSeconds: number }
// Response: { status, message, data: { enrollment } }
// Note: enrollment here is the raw Mongoose document (student/course/instructor/
// transaction are ids, not the joined *Details summaries from the GET endpoints).
export interface UpdateEnrollmentProgressRequestBody {
  lastPositionInSeconds: number;
}

export interface RawEnrollment {
  _id: string;
  student: string;
  course: string;
  instructor: string;
  transaction: string;
  enrolledAt: string;
  totalDurationWatchedInMinutes: number;
  watchPercentage: number;
  watchedCompletely: boolean;
  watchedCompletelyAt: string | null;
  mostRecentlySeen: boolean;
  certificateIssued: boolean;
  certificateIssuedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateEnrollmentProgressResponseData {
  enrollment: RawEnrollment;
}

export type UpdateEnrollmentProgressResponse =
  | SuccessApiResponse<
      UpdateEnrollmentProgressResponseData,
      "Enrollment progress updated successfully"
    >
  | ApiErrorResponse;
