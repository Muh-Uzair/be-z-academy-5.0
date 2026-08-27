import Stripe from "stripe";
import { stripe } from "../config/stripe";
import UserModel, { Role } from "../models/userModel";
import AppError from "../utils/appError";
import { STRIPE_ONBOARDING_URL } from "../constants/stripeConstant";
import TransactionModel from "../models/transactionModel";
import EnrollmentModel from "../models/enrollmentModel";
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

// FUNCTION
export const handlePaymentIntentSucceededService = async (
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> => {
  const { courseId, studentId, instructorId } = paymentIntent.metadata;

  if (!courseId || !studentId || !instructorId) {
    console.error(
      "Missing metadata in PaymentIntent. Cannot create Transaction and Enrollment.",
      paymentIntent.id,
    );
    return;
  }

  // Calculate dollar amounts from the Stripe cents
  const totalPrice = paymentIntent.amount / 100;
  // If application_fee_amount is null, default to 0
  const adminCommission = (paymentIntent.application_fee_amount || 0) / 100;
  const instructorRevenue = totalPrice - adminCommission;

  // Stripe can sometimes send the same webhook twice. 
  // Let's check if we already processed this payment to avoid duplicates.
  const existingTransaction = await TransactionModel.findOne({ transactionId: paymentIntent.id });
  if (existingTransaction) {
    console.log(`Transaction ${paymentIntent.id} already processed. Skipping.`);
    return;
  }

  // Step 1: Create a new Transaction record
  const transaction = await TransactionModel.create({
    transactionId: paymentIntent.id,
    student: studentId,
    course: courseId,
    instructor: instructorId,
    totalPrice,
    amountPaid: totalPrice,
    amountPaidAt: new Date(),
    paymentStatus: "paid",
    adminCommission,
    instructorRevenue,
    currency: paymentIntent.currency,
    stripeChargeId: typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : paymentIntent.latest_charge?.id || null,
  });

  // Step 2: Create a new Enrollment record
  await EnrollmentModel.create({
    student: studentId,
    course: courseId,
    instructor: instructorId,
    transaction: transaction._id,
    enrolledAt: new Date(),
  });

  console.log(
    `Successfully created Transaction and Enrollment for student ${studentId} in course ${courseId}`,
  );
};

// FUNCTION
export const handleChargeRefundedService = async (
  charge: Stripe.Charge,
): Promise<void> => {
  // Step 1: Find the transaction using the Stripe charge ID
  const transaction = await TransactionModel.findOne({
    stripeChargeId: charge.id,
  });

  if (!transaction) {
    console.error(
      `No transaction found for charge ${charge.id}. Cannot process refund.`,
    );
    return;
  }

  // Step 2: Guard against processing the same refund webhook twice
  if (transaction.paymentStatus === "refunded") {
    console.log(`Transaction ${transaction.transactionId} already marked as refunded. Skipping.`);
    return;
  }

  // Step 3: Mark the transaction as refunded
  await TransactionModel.updateOne(
    { _id: transaction._id },
    { $set: { paymentStatus: "refunded" } },
  );

  // Step 4: Delete the enrollment so the student loses access to the course
  await EnrollmentModel.deleteOne({
    student: transaction.student,
    course: transaction.course,
  });

  console.log(
    `Refund processed successfully. Transaction ${transaction.transactionId} marked as refunded and enrollment removed.`,
  );
};
