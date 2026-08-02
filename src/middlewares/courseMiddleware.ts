import { Request, Response, NextFunction } from "express";
import catchAsync from "@src/utils/catchAsync";
import AppError from "@src/utils/appError";
import UserModel from "@src/models/userModel";

/**
 * Ensures the instructor has completed Stripe onboarding before they can create a course.
 * Must run after protect (relies on req.user.id).
 */
const requireStripeOnboarding = catchAsync(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const instructorId = req.user!.id;

    const instructor = await UserModel.findById(instructorId).select(
      "stripeOnboardingComplete",
    );

    if (!instructor) {
      throw new AppError(404, "Instructor not found");
    }

    if (!instructor.stripeOnboardingComplete) {
      throw new AppError(
        403,
        "Please complete your Stripe onboarding before creating a course",
      );
    }

    next();
  },
);

export default requireStripeOnboarding;
