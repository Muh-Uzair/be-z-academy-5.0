// This file is intentionally framework-independent. Copy it directly into a
// frontend project; it has no backend imports and represents JSON values only.

import { SuccessApiResponse, ApiErrorResponse } from "./authResponseTypes";
import { Pagination } from "./userResponseTypes";

export interface ReviewUserSummary {
  _id: string;
  fullName: string;
  email: string;
  avatar: string | null;
}

// Every review endpoint joins the raw course document as courseDetails
// without computing thumbnailUrl/videoUrl (that only happens on the course
// endpoints themselves) — thumbnailKey/videoKey are stripped for safety, but
// no image/video URL is available here. Fetch GET /courses/:id separately
// if you need to display the course's thumbnail or video.
export interface ReviewCourseSummary {
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

export interface Review {
  _id: string;
  rating: number;
  feedback: string;
  reviewByDetails: ReviewUserSummary;
  courseDetails: ReviewCourseSummary;
  instructorDetails: ReviewUserSummary;
  createdAt: string;
  updatedAt: string;
}

// The create/update endpoints return the plain Mongoose document (no
// lookups performed), so reviewBy/course/instructor come back as raw ids
// rather than joined *Details summaries.
export interface ReviewDocument {
  _id: string;
  rating: number;
  feedback: string;
  reviewBy: string;
  course: string;
  instructor: string;
  createdAt: string;
  updatedAt: string;
}

// API 1: POST /api/v1/reviews
// Response: { status, message, data: { review } }
export interface CreateReviewResponseData {
  review: ReviewDocument;
}

export type CreateReviewResponse =
  | SuccessApiResponse<CreateReviewResponseData, "Review created successfully">
  | ApiErrorResponse;

// API 2: GET /api/v1/reviews
// Response: { status, message, data: { reviews, pagination } }
export interface GetReviewsResponseData {
  reviews: Review[];
  pagination: Pagination;
}

export type GetReviewsResponse =
  | SuccessApiResponse<GetReviewsResponseData, "Reviews fetched successfully">
  | ApiErrorResponse;

// API 3: GET /api/v1/reviews/:id
// Response: { status, message, data: { review } }
export interface GetReviewDetailsResponseData {
  review: Review;
}

export type GetReviewDetailsResponse =
  | SuccessApiResponse<
      GetReviewDetailsResponseData,
      "Review details fetched successfully"
    >
  | ApiErrorResponse;

// API 4: PATCH /api/v1/reviews/:id
// Response: { status, message, data: { review } }
export interface UpdateReviewResponseData {
  review: ReviewDocument;
}

export type UpdateReviewResponse =
  | SuccessApiResponse<UpdateReviewResponseData, "Review updated successfully">
  | ApiErrorResponse;

// API 5: DELETE /api/v1/reviews/:id
// Response: { status, message, data: null }
export type DeleteReviewResponse =
  | SuccessApiResponse<null, "Review deleted successfully">
  | ApiErrorResponse;
