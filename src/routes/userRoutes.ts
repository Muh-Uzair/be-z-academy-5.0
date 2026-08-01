import { Router } from "express";
import {
  getInstructors,
  getInstructorDetails,
  updateInstructorVerification,
  getInstructorOnboardingLink,
  updateProfile,
} from "@src/controllers/userController";
import validation from "@src/middlewares/validation";
import protect from "@src/middlewares/protect";
import restrictTo from "@src/middlewares/restrictTo";
import { Role } from "@src/models/userModel";
import {
  getInstructorsQuerySchema,
  instructorIdParamsSchema,
  updateInstructorVerificationSchema,
  updateProfileSchema,
} from "@src/validations/userValidations";

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
  "/instructor/:id",
  protect,
  restrictTo(Role.Admin),
  validation(instructorIdParamsSchema, "params"),
  getInstructorDetails,
);

userRouter.patch(
  "/instructor/:id/verification",
  protect,
  restrictTo(Role.Admin),
  validation(instructorIdParamsSchema, "params"),
  validation(updateInstructorVerificationSchema, "body"),
  updateInstructorVerification,
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
