import { Router } from "express";
import {
  getInstructors,
  getInstructorDetails,
  updateInstructorVerification,
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
  "/instructors/:id",
  protectMiddleware,
  restrictToMiddleware(Role.Admin),
  validationMiddleware(instructorIdParamsSchema, "params"),
  getInstructorDetails,
);

userRouter.patch(
  "/instructors/:id/verification",
  protectMiddleware,
  restrictToMiddleware(Role.Admin),
  validationMiddleware(instructorIdParamsSchema, "params"),
  validationMiddleware(updateInstructorVerificationSchema, "body"),
  updateInstructorVerification,
);

// ─── Instructor Routes ────────────────────────────────────────────────────────

// ─── Student Routes ───────────────────────────────────────────────────────────

// ─── Shared Routes ────────────────────────────────────────────────────────────

export default userRouter;
