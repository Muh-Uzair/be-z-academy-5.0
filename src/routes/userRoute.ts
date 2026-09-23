import { Router } from "express";
import {
  getInstructors,
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

userRouter.get(
  "/instructors",
  protect,
  restrictTo(Role.Admin, Role.Student),
  validation(getInstructorsQuerySchema, "query"),
  getInstructors,
);

userRouter.get(
  "/user/:id",
  protect,
  restrictTo(Role.Admin, Role.Student, Role.Instructor),
  validation(userIdParamsSchema, "params"),
  validation(userRoleQuerySchema, "query"),
  getUserDetails,
);

userRouter.patch(
  "/user/:id/verification",
  protect,
  restrictTo(Role.Admin),
  validation(userIdParamsSchema, "params"),
  validation(userRoleQuerySchema, "query"),
  validation(updateUserVerificationSchema, "body"),
  updateUserVerification,
);

userRouter.get(
  "/students",
  protect,
  restrictTo(Role.Admin, Role.Instructor),
  validation(getStudentsQuerySchema, "query"),
  getStudents,
);

userRouter.get(
  "/get-instructor-onboarding-link",
  protect,
  restrictTo(Role.Instructor),
  getInstructorOnboardingLink,
);

userRouter.get(
  "/profile",
  protect,
  getProfile,
);

userRouter.patch(
  "/profile",
  protect,
  validation(updateProfileSchema, "body"),
  updateProfile,
);

userRouter.post(
  "/profile/upload-avatar",
  protect,
  validation(uploadAvatarSchema, "body"),
  uploadAvatar,
);

export default userRouter;
