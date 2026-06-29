import { Router } from "express";
import { signup } from "@src/controllers/authController";
import validationMiddleware from "@src/middlewares/validationMiddleware";
import { signupSchema } from "@src/validations/authValidations";

const authRouter = Router();

authRouter.post("/signup", validationMiddleware(signupSchema), signup);

export default authRouter;
