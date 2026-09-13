import { Router } from "express";
import {
  getInstructors,
  getStudents,
  getUserDetails,
  updateUserVerification,
  getInstructorOnboardingLink,
  updateProfile,
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
} from "../validations/userValidation";

const userRouter = Router();

// ─── Admin Routes ─────────────────────────────────────────────────────────────

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
  restrictTo(Role.Admin, Role.Student),
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

// ─── Admin + Instructor Routes ─────────────────────────────────────────────────

userRouter.get(
  "/students",
  protect,
  restrictTo(Role.Admin, Role.Instructor),
  validation(getStudentsQuerySchema, "query"),
  getStudents,
);

// ─── Instructor Routes ────────────────────────────────────────────────────────

userRouter.get(
  "/get-instructor-onboarding-link",
  protect,
  restrictTo(Role.Instructor),
  getInstructorOnboardingLink,
);

// ─── Student Routes ───────────────────────────────────────────────────────────

// ─── Shared Routes ────────────────────────────────────────────────────────────

userRouter.patch(
  "/update-profile",
  protect,
  validation(updateProfileSchema, "body"),
  updateProfile,
);

export default userRouter;
