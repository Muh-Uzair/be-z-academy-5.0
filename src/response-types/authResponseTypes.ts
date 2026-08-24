// This file is intentionally framework-independent. Copy it directly into a
// frontend project; it has no backend imports and represents JSON values only.

export type ApiStatus = "success" | "fail" | "error";

export interface ApiResponse<TData> {
  status: ApiStatus;
  message: string;
  data: TData;
}

export type SuccessApiResponse<TData, TMessage extends string> = {
  status: "success";
  message: TMessage;
  data: TData;
};

// Every endpoint can also return this shape when validation, authorization,
// or an application error occurs. `data` may contain error details or be null.
export type ApiErrorResponse = {
  status: "fail" | "error";
  message: string;
  data: unknown;
};

// Used by endpoints whose successful response body has `data: null`.
// For sign-in and token rotation, tokens are sent as HTTP-only cookies,
// never in the JSON response body.
export type EmptyAuthResponseData = null;

// User fields currently returned from GET /me. MongoDB ObjectIds and dates
// are serialized by the API, so the frontend receives strings. Note: the
// current backend does not strip otp, otpExpires, or __v from this response.
export interface PublicUser {
  _id: string;
  fullName: string;
  email: string;
  bio: string;
  highestEducation: string;
  yearsOfExperience: number;
  avatar: string | null;
  isVerified: boolean;
  verificationRejectionReason: string | null;
  lastVerificationRejectedAt: string | null;
  otp: string | null;
  otpExpires: string | null;
  role: "admin" | "instructor" | "student";
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// API 6: GET /api/v1/auth/me
// Response: { status, message, data: { user } }
export interface GetMeResponseData {
  user: PublicUser;
}

// API 1: POST /api/v1/auth/signup
// Status: 201
// Student example response:
// {
//   "status": "success",
//   "message": "Signup successful, please check your email for the OTP",
//   "data": null
// }
// Instructor example response:
// {
//   "status": "success",
//   "message": "Signup successful, your account will be reviewed by an Admin before you can sign in",
//   "data": null
// }
export type SignupResponse =
  | SuccessApiResponse<
      EmptyAuthResponseData,
      | "Signup successful, please check your email for the OTP"
      | "Signup successful, your account will be reviewed by an Admin before you can sign in"
    >
  | ApiErrorResponse;

// API 2: POST /api/v1/auth/verify-otp
// Status: 200
// Example response:
// {
//   "status": "success",
//   "message": "Account verified successfully",
//   "data": null
// }
export type VerifyOtpResponse =
  | SuccessApiResponse<
      EmptyAuthResponseData,
      "Account verified successfully"
    >
  | ApiErrorResponse;

// API 3: POST /api/v1/auth/resend-otp
// Status: 200
// Example response:
// {
//   "status": "success",
//   "message": "OTP resent successfully, please check your email",
//   "data": null
// }
export type ResendOtpResponse =
  | SuccessApiResponse<
      EmptyAuthResponseData,
      "OTP resent successfully, please check your email"
    >
  | ApiErrorResponse;

// API 4: POST /api/v1/auth/signin
// Status: 200
// Example response:
// {
//   "status": "success",
//   "message": "Signed in successfully",
//   "data": null
// }
// Side effect: sets accessToken and refreshToken HTTP-only cookies.
export type SigninResponse =
  | SuccessApiResponse<EmptyAuthResponseData, "Signed in successfully">
  | ApiErrorResponse;

// API 5: POST /api/v1/auth/rotate-token
// Status: 200
// Example response:
// {
//   "status": "success",
//   "message": "Token rotated successfully",
//   "data": null
// }
// Side effect: replaces accessToken and refreshToken HTTP-only cookies.
export type RotateTokenResponse =
  | SuccessApiResponse<EmptyAuthResponseData, "Token rotated successfully">
  | ApiErrorResponse;

// API 6: GET /api/v1/auth/me
// Status: 200
// Example response:
// {
//   "status": "success",
//   "message": "Current user fetched successfully",
//   "data": {
//     "user": {
//       "_id": "66d1a1b2c3d4e5f678901234",
//       "fullName": "John Doe",
//       "email": "john@example.com",
//       "bio": "Software engineering student",
//       "highestEducation": "Bachelor's degree",
//       "yearsOfExperience": 2,
//       "avatar": null,
//       "isVerified": true,
//       "role": "student",
//       "stripeAccountId": null,
//       "stripeOnboardingComplete": false,
//       "createdAt": "2026-08-25T10:00:00.000Z",
//       "updatedAt": "2026-08-25T10:00:00.000Z"
//     }
//   }
// }
export type GetMeResponse =
  | SuccessApiResponse<
      GetMeResponseData,
      "Current user fetched successfully"
    >
  | ApiErrorResponse;
