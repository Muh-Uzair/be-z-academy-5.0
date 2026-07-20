import { Router } from "express";
import {
  getInstructors,
  getInstructorDetails,
  updateInstructorVerification,
  getInstructorOnboardingLink,
} from "@src/controllers/userController";
import validationMiddleware from "@src/middlewares/validationMiddleware";
import protectMiddleware from "@src/middlewares/protectMiddleware";
import restrictToMiddleware from "@src/middlewares/restrictToMiddleware";
import { Role } from "@src/models/userModel";
import {
  getInstructorsQuerySchema,
  instructorIdParamsSchema,
  updateInstructorVerificationSchema,
} from "@src/validations/userValidations";

const userRouter = Router();

// ─── Admin Routes ─────────────────────────────────────────────────────────────

userRouter.get(
  "/instructors",
  protectMiddleware,
  restrictToMiddleware(Role.Admin),
  validationMiddleware(getInstructorsQuerySchema, "query"),
  getInstructors,
);

userRouter.get(
  "/instructor/:id",
  protectMiddleware,
  restrictToMiddleware(Role.Admin),
  validationMiddleware(instructorIdParamsSchema, "params"),
  getInstructorDetails,
);

userRouter.patch(
  "/instructor/:id/verification",
  protectMiddleware,
  restrictToMiddleware(Role.Admin),
  validationMiddleware(instructorIdParamsSchema, "params"),
  validationMiddleware(updateInstructorVerificationSchema, "body"),
  updateInstructorVerification,
);

// ─── Instructor Routes ────────────────────────────────────────────────────────

userRouter.get(
  "/get-instructor-onboarding-link",
  protectMiddleware,
  restrictToMiddleware(Role.Instructor),
  getInstructorOnboardingLink,
);

// ─── Student Routes ───────────────────────────────────────────────────────────

// ─── Shared Routes ────────────────────────────────────────────────────────────

export default userRouter;
