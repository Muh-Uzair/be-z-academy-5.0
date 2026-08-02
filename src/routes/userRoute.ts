import { Router } from "express";
import {
  getInstructors,
  getUserDetails,
  updateUserVerification,
  getInstructorOnboardingLink,
  updateProfile,
} from "@src/controllers/userController";
import validation from "@src/middlewares/validation";
import protect from "@src/middlewares/protect";
import restrictTo from "@src/middlewares/restrictTo";
import { Role } from "@src/models/userModel";
import {
  getInstructorsQuerySchema,
  userIdParamsSchema,
  updateUserVerificationSchema,
  updateProfileSchema,
} from "@src/validations/userValidation";

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
  getUserDetails,
);

userRouter.patch(
  "/user/:id/verification",
  protect,
  restrictTo(Role.Admin),
  validation(userIdParamsSchema, "params"),
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
