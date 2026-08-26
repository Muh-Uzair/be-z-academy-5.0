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
// Cookie-based auth flows such as token rotation keep tokens in HTTP-only
// cookies instead of the JSON response body.
export type EmptyAuthResponseData = null;

// Unified public user shape returned by both POST /signin and GET /me.
// Sensitive or internal fields (password, otp, otpExpires, __v,
// stripeAccountId, stripeOnboardingComplete, verificationRejectionReason,
// lastVerificationRejectedAt) are never included.
export interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  role: "admin" | "instructor" | "student";
  avatar: string | null;
  bio: string;
  highestEducation: string;
  yearsOfExperience: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// API 6: GET /api/v1/auth/me
// Response: { status, message, data: { user } }
export interface GetMeResponseData {
  user: AuthUser;
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

export interface SigninResponseData {
  user: AuthUser;
}

// API 4: POST /api/v1/auth/signin
// Status: 200
// Example response:
// {
//   "status": "success",
//   "message": "Signed in successfully",
//   "data": {
//     "user": {
//       "_id": "66d1a1b2c3d4e5f678901234",
//       "fullName": "John Doe",
//       "email": "john@example.com",
//       "role": "student",
//       "avatar": null,
//       "bio": "Computer science student",
//       "highestEducation": "Bachelor's degree",
//       "yearsOfExperience": 0,
//       "isVerified": true,
//       "createdAt": "2026-08-25T10:00:00.000Z",
//       "updatedAt": "2026-08-25T10:00:00.000Z"
//     }
//   }
// }
// Side effect: sets accessToken and refreshToken HTTP-only cookies.
export type SigninResponse =
  | SuccessApiResponse<SigninResponseData, "Signed in successfully">
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
//       "role": "student",
//       "avatar": null,
//       "bio": "Computer science student",
//       "highestEducation": "Bachelor's degree",
//       "yearsOfExperience": 0,
//       "isVerified": true,
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

// API 7: POST /api/v1/auth/signout
// Status: 200
// Example response:
// {
//   "status": "success",
//   "message": "Signed out successfully",
//   "data": null
// }
// Side effect: clears accessToken and refreshToken HTTP-only cookies.
export type SignoutResponse =
  | SuccessApiResponse<EmptyAuthResponseData, "Signed out successfully">
  | ApiErrorResponse;
