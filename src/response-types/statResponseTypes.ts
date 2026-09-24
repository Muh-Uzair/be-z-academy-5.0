import { SuccessApiResponse, ApiErrorResponse } from "./authResponseTypes";

// API: GET /api/v1/stats
// Response: { status, message, data: { totalStudents, totalCourses } }
export interface GetPlatformStatsResponseData {
  totalStudents: number;
  totalCourses: number;
}

export type GetPlatformStatsResponse =
  | SuccessApiResponse<
      GetPlatformStatsResponseData,
      "Platform stats fetched successfully"
    >
  | ApiErrorResponse;
