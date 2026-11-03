import { Router } from "express";
import {
  getSavedCards,
  createCardSetupIntent,
  setDefaultCard,
  deleteSavedCard,
} from "../controllers/cardController";
import protect from "../middlewares/protect";
import restrictTo from "../middlewares/restrictTo";
import { Role } from "../models/userModel";
import validation from "../middlewares/validation";
import { cardIdParamsSchema } from "../validations/cardValidation";

const cardRouter = Router();

// Every card endpoint requires an authenticated student session
cardRouter.use(protect, restrictTo(Role.Student));

// DIVIDER Admin Routes ---------------------------------------------------------

// DIVIDER Instructor Routes ---------------------------------------------------------

// DIVIDER Student Routes ---------------------------------------------------------

// (root)/api/v1/cards
cardRouter.get("/", getSavedCards);

// (root)/api/v1/cards/setup-intent
cardRouter.post("/setup-intent", createCardSetupIntent);

// (root)/api/v1/cards/:id/default
cardRouter.patch(
  "/:id/default",
  validation(cardIdParamsSchema, "params"),
  setDefaultCard,
);

// (root)/api/v1/cards/:id
cardRouter.delete(
  "/:id",
  validation(cardIdParamsSchema, "params"),
  deleteSavedCard,
);

// DIVIDER Admin + Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Admin + Instructor Routes ---------------------------------------------------------

// DIVIDER Admin + Student Routes ---------------------------------------------------------

// DIVIDER Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Public Routes ---------------------------------------------------------

export default cardRouter;
