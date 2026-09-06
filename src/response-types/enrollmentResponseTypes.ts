// This file is intentionally framework-independent. Copy it directly into a
// frontend project; it has no backend imports and represents JSON values only.

import { SuccessApiResponse, ApiErrorResponse } from "./authResponseTypes";
import { Pagination } from "./userResponseTypes";

export interface EnrollmentUserSummary {
  _id: string;
  fullName: string;
  email: string;
  avatar: string | null;
}

// Every enrollment endpoint joins the raw course document as courseDetails
// without computing thumbnailUrl/videoUrl (that only happens on the course
// endpoints themselves) — thumbnailKey/videoKey are stripped for safety, but
// no image/video URL is available here. Fetch GET /courses/:id separately
// if you need to display the course's thumbnail or video.
export interface EnrollmentCourseSummary {
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

export interface EnrollmentTransactionSummary {
  _id: string;
  transactionId: string;
  stripeChargeId: string | null;
  currency: string;
  student: string;
  course: string;
  instructor: string;
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
