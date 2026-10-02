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

cardRouter.get("/", getSavedCards);
cardRouter.post("/setup-intent", createCardSetupIntent);
cardRouter.patch(
  "/:id/default",
  validation(cardIdParamsSchema, "params"),
  setDefaultCard,
);
cardRouter.delete(
  "/:id",
  validation(cardIdParamsSchema, "params"),
  deleteSavedCard,
);

export default cardRouter;
