// This file is intentionally framework-independent. Copy it directly into a
// frontend project; it has no backend imports and represents JSON values only.

import { SuccessApiResponse, ApiErrorResponse } from "./authResponseTypes";
import { Pagination } from "./userResponseTypes";

export type CourseLevel = "beginner" | "intermediate" | "advanced";

export interface Course {
  _id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  price: number;
  level: CourseLevel;
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

export interface CourseInstructorSummary {
  _id: string;
  fullName: string;
  email: string;
  avatar: string | null;
}

export interface CourseCategorySummary {
  _id: string;
  name: string;
  description: string;
}

// Course shape returned by the list endpoint (API 10), where instructor/category
// ids are replaced by joined *Details summaries.
export interface CourseListItem extends Omit<Course, "instructor" | "category"> {
  instructorDetails: CourseInstructorSummary;
  categoryDetails: CourseCategorySummary;
}

// API 1: POST /api/v1/courses/upload-thumbnail
// Response: { status, message, data: { uploadUrl, fields, key } }
export interface UploadCourseThumbnailResponseData {
  uploadUrl: string;
  fields: Record<string, string>;
  key: string;
}

export type UploadCourseThumbnailResponse =
  | SuccessApiResponse<
      UploadCourseThumbnailResponseData,
      "Course thumbnail upload URL generated successfully"
    >
  | ApiErrorResponse;

// API 2: POST /api/v1/courses/upload-video
// Response: { status, message, data: { uploadUrl, fields, key } }
export interface UploadCourseVideoResponseData {
  uploadUrl: string;
  fields: Record<string, string>;
  key: string;
}

export type UploadCourseVideoResponse =
  | SuccessApiResponse<
      UploadCourseVideoResponseData,
      "Course video upload URL generated successfully"
    >
  | ApiErrorResponse;

// API 3: POST /api/v1/courses
// Response: { status, message, data: { course } }
export interface CreateCourseResponseData {
  course: Course;
}

export type CreateCourseResponse =
  | SuccessApiResponse<
      CreateCourseResponseData,
      "Course created successfully, it will be reviewed by an Admin"
    >
  | ApiErrorResponse;

// API 4: PATCH /api/v1/courses/:id
// Response: { status, message, data: { course } }
export interface UpdateCourseResponseData {
  course: Course;
}

export type UpdateCourseResponse =
  | SuccessApiResponse<UpdateCourseResponseData, "Course updated successfully">
  | ApiErrorResponse;

// API 5: DELETE /api/v1/courses/:id
// Response: { status, message, data: null }
export type DeleteCourseResponse =
  | SuccessApiResponse<null, "Course deleted successfully">
  | ApiErrorResponse;

// API 6: PATCH /api/v1/courses/:id/verification
// Response: { status, message, data: { course } }
export interface UpdateCourseVerificationResponseData {
  course: Course;
}

export type UpdateCourseVerificationResponse =
  | SuccessApiResponse<
      UpdateCourseVerificationResponseData,
      "Course approved successfully" | "Course rejected successfully"
    >
  | ApiErrorResponse;

// API 9: POST /api/v1/courses/:id/payment-intent
// Response: { status, message, data: { clientSecret } }
export interface CreateCoursePaymentIntentResponseData {
  clientSecret: string | null;
}

export type CreateCoursePaymentIntentResponse =
  | SuccessApiResponse<
      CreateCoursePaymentIntentResponseData,
      "Payment intent created successfully"
    >
  | ApiErrorResponse;

// API 10: POST /api/v1/courses/:id/refund
// Response: { status, message, data: null }
export type RequestCourseRefundResponse =
  | SuccessApiResponse<
      null,
      "Refund initiated successfully. Your money will be returned within 5-10 business days"
    >
  | ApiErrorResponse;

// API 11: GET /api/v1/courses/:id/completion-status
// Response: { status, message, data: { completionPercentage, completed } }
export interface GetCourseCompletionStatusResponseData {
  completionPercentage: number;
  completed: boolean;
}

export type GetCourseCompletionStatusResponse =
  | SuccessApiResponse<
      GetCourseCompletionStatusResponseData,
      "Course completion status fetched successfully"
    >
  | ApiErrorResponse;

// API 7: GET /api/v1/courses
// Response: { status, message, data: { courses, pagination } }
export interface GetCoursesResponseData {
  courses: CourseListItem[];
  pagination: Pagination;
}

export type GetCoursesResponse =
  | SuccessApiResponse<GetCoursesResponseData, "Courses fetched successfully">
  | ApiErrorResponse;

// API 8: GET /api/v1/courses/:id
// Response: { status, message, data: { course } }
export interface GetCourseDetailsResponseData {
  course: Course;
}

export type GetCourseDetailsResponse =
  | SuccessApiResponse<
      GetCourseDetailsResponseData,
      "Course details fetched successfully"
    >
  | ApiErrorResponse;
