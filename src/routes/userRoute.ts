import { Router } from "express";
import {
  getInstructors,
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
  restrictTo(Role.Admin),
  validation(getInstructorsQuerySchema, "query"),
  getInstructors,
);

userRouter.get(
  "/user/:id",
  protect,
  restrictTo(Role.Admin),
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
