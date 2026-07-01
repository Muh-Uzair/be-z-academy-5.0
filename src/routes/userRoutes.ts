import { Router } from "express";
import { getInstructors } from "@src/controllers/userController";
import validationMiddleware from "@src/middlewares/validationMiddleware";
import protect from "@src/middlewares/protectMiddleware";
import restrictTo from "@src/middlewares/restrictToMiddleware";
import { Role } from "@src/models/userModel";
import { getInstructorsQuerySchema } from "@src/validations/userValidations";

const userRouter = Router();

// ─── Admin Routes ─────────────────────────────────────────────────────────────

userRouter.get(
  "/instructors",
  protect,
  restrictTo(Role.Admin),
  validationMiddleware(getInstructorsQuerySchema, "query"),
  getInstructors,
);

// ─── Instructor Routes ────────────────────────────────────────────────────────

// ─── Student Routes ───────────────────────────────────────────────────────────

// ─── Shared Routes ────────────────────────────────────────────────────────────

export default userRouter;
