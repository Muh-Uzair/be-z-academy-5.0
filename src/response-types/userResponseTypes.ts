// This file is intentionally framework-independent. Copy it directly into a
// frontend project; it has no backend imports and represents JSON values only.

import { AuthUser, SuccessApiResponse, ApiErrorResponse } from "./authResponseTypes";

// Full user document shape as returned by the admin-only user endpoints.
// Same public projection as AuthUser (see authResponseTypes.ts).
export type UserDetails = AuthUser;

export type UserRole = "admin" | "instructor" | "student";

export interface Pagination {
  page: number;
  limit: number;
  totalDocuments: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// API 1: GET /api/v1/users/instructors
// Response: { status, message, data: { instructors, pagination } }
export interface GetInstructorsResponseData {
  instructors: UserDetails[];
  pagination: Pagination;
}

export type GetInstructorsResponse =
  | SuccessApiResponse<
      GetInstructorsResponseData,
      "Instructors fetched successfully"
    >
  | ApiErrorResponse;

// API 2: GET /api/v1/users/user/:id
// Response: { status, message, data: { user } }
// `message` is "<Role> details fetched successfully" for the requested role.
export interface GetUserDetailsResponseData {
  user: UserDetails;
}

export type GetUserDetailsResponse =
  | SuccessApiResponse<
      GetUserDetailsResponseData,
      `${string} details fetched successfully`
    >
  | ApiErrorResponse;

// API 3: PATCH /api/v1/users/user/:id/verification
// Response: { status, message, data: { user } }
// `message` is "<Role> approved successfully" or "<Role> rejected successfully".
export interface UpdateUserVerificationResponseData {
  user: UserDetails;
}

export type UpdateUserVerificationResponse =
  | SuccessApiResponse<
      UpdateUserVerificationResponseData,
      `${string} approved successfully` | `${string} rejected successfully`
    >
  | ApiErrorResponse;

// API 4: GET /api/v1/users/get-instructor-onboarding-link
// Response: { status, message, data: { url } }
export interface GetInstructorOnboardingLinkResponseData {
  url: string;
}

export type GetInstructorOnboardingLinkResponse =
  | SuccessApiResponse<
      GetInstructorOnboardingLinkResponseData,
      "Stripe onboarding link generated successfully"
    >
  | ApiErrorResponse;

// API 5: PATCH /api/v1/users/update-profile
// Response: { status, message, data: { user } }
export interface UpdateProfileResponseData {
  user: UserDetails;
}

export type UpdateProfileResponse =
  | SuccessApiResponse<UpdateProfileResponseData, "Profile updated successfully">
  | ApiErrorResponse;
