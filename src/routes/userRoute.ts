import { Router } from "express";
import {
  getInstructors,
  getPublicInstructors,
  getStudents,
  getUserDetails,
  updateUserVerification,
  getInstructorOnboardingLink,
  updateProfile,
  getProfile,
  uploadAvatar,
} from "../controllers/userController";
import validation from "../middlewares/validation";
import protect from "../middlewares/protect";
import restrictTo from "../middlewares/restrictTo";
import { Role } from "../models/userModel";
import {
  getInstructorsQuerySchema,
  getStudentsQuerySchema,
  userIdParamsSchema,
  updateUserVerificationSchema,
  updateProfileSchema,
  userRoleQuerySchema,
  uploadAvatarSchema,
} from "../validations/userValidation";

const userRouter = Router();

// DIVIDER Admin Routes ---------------------------------------------------------

// (root)/api/v1/users/user/:id/verification
// Api # 1
userRouter.patch(
  "/user/:id/verification",
  protect,
  restrictTo(Role.Admin),
  validation(userIdParamsSchema, "params"),
  validation(userRoleQuerySchema, "query"),
  validation(updateUserVerificationSchema, "body"),
  updateUserVerification,
);

// DIVIDER Instructor Routes ---------------------------------------------------------

// (root)/api/v1/users/get-instructor-onboarding-link
// Api # 2
userRouter.get(
  "/get-instructor-onboarding-link",
  protect,
  restrictTo(Role.Instructor),
  getInstructorOnboardingLink,
);

// DIVIDER Student Routes ---------------------------------------------------------

// DIVIDER Admin + Instructor + Student Routes ---------------------------------------------------------

// (root)/api/v1/users/user/:id
// Api # 3
userRouter.get(
  "/user/:id",
  protect,
  restrictTo(Role.Admin, Role.Student, Role.Instructor),
  validation(userIdParamsSchema, "params"),
  validation(userRoleQuerySchema, "query"),
  getUserDetails,
);

// (root)/api/v1/users/profile
// Api # 4
userRouter.get(
  "/profile",
  protect,
  getProfile,
);

// (root)/api/v1/users/profile
// Api # 5
userRouter.patch(
  "/profile",
  protect,
  validation(updateProfileSchema, "body"),
  updateProfile,
);

// (root)/api/v1/users/profile/upload-avatar
// Api # 6
userRouter.post(
  "/profile/upload-avatar",
  protect,
  validation(uploadAvatarSchema, "body"),
  uploadAvatar,
);

// DIVIDER Admin + Instructor Routes ---------------------------------------------------------

// (root)/api/v1/users/students
// Api # 7
userRouter.get(
  "/students",
  protect,
  restrictTo(Role.Admin, Role.Instructor),
  validation(getStudentsQuerySchema, "query"),
  getStudents,
);

// DIVIDER Admin + Student Routes ---------------------------------------------------------

// (root)/api/v1/users/instructors
// Api # 8
userRouter.get(
  "/instructors",
  protect,
  restrictTo(Role.Admin, Role.Student),
  validation(getInstructorsQuerySchema, "query"),
  getInstructors,
);

// DIVIDER Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Public Routes ---------------------------------------------------------

// (root)/api/v1/users/instructors/public
// Api # 9
userRouter.get(
  "/instructors/public",
  validation(getInstructorsQuerySchema, "query"),
  getPublicInstructors,
);

export default userRouter;
