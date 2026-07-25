import Stripe from "stripe";
import { stripe } from "@src/config/stripe";
import UserModel, { Role } from "@src/models/userModel";
import AppError from "@src/utils/appError";
import { STRIPE_ONBOARDING_URL } from "@src/constants/stripeConstants";

// FUNCTION
export const getInstructorOnboardingLinkService = async (
  instructorId: string,
): Promise<{ url: string }> => {
  // Step 1: Ensure the instructor exists
  const instructor = await UserModel.findOne({
    _id: instructorId,
    role: Role.Instructor,
  });

  if (!instructor) {
    throw new AppError(404, "Instructor not found");
  }

  // Step 2: Create a Stripe Express connected account if one doesn't exist yet
  let stripeAccountId = instructor.stripeAccountId;

  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: instructor.email,
    });

    stripeAccountId = account.id;
    instructor.stripeAccountId = stripeAccountId;
    await instructor.save();
  }

  // Step 3: Generate a fresh onboarding link for that connected account
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: STRIPE_ONBOARDING_URL,
    return_url: STRIPE_ONBOARDING_URL,
    type: "account_onboarding",
  });

  return { url: accountLink.url };
};

// FUNCTION
export const handleAccountUpdatedEventService = async (
  account: Stripe.Account,
): Promise<void> => {
  // Step 1: Check if the account has completed onboarding.
  // We consider onboarding complete if they are able to receive payouts or charges.
  const isComplete = account.payouts_enabled || account.charges_enabled || account.details_submitted;

  if (!isComplete) {
    return; // They haven't finished yet
  }

  // Step 2: Mark the instructor's onboarding as complete in the database
  await UserModel.updateOne(
    { stripeAccountId: account.id, role: Role.Instructor },
    { $set: { stripeOnboardingComplete: true } },
  );
};
