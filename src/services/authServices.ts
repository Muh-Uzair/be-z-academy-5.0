import { SignupBody } from "@src/types/authTypes";
import AppError from "@src/utils/appError";

export const signupService = async (body: SignupBody): Promise<void> => {
  console.log("signupService received body:", body);

  // TODO: remove — intentional test error to verify global error handling
  throw new AppError(400, "This is a test operational error from signupService");
};
