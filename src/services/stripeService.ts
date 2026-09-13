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
  const isComplete =
    account.payouts_enabled ||
    account.charges_enabled ||
    account.details_submitted;

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
  // Step 1: Extract and validate the metadata attached at payment-intent creation
  const { courseId, studentId, instructorId } = paymentIntent.metadata;

  if (!courseId || !studentId || !instructorId) {
    console.error(
      "Missing metadata in PaymentIntent. Cannot create Transaction and Enrollment.",
      paymentIntent.id,
    );
    return;
  }

  // Step 2: Calculate dollar amounts from the Stripe cents
  const totalPrice = paymentIntent.amount / 100;
  // If application_fee_amount is null, default to 0
  const adminCommission = (paymentIntent.application_fee_amount || 0) / 100;
  const instructorRevenue = totalPrice - adminCommission;

  // Step 3: Load the pending Transaction created when the PaymentIntent was
  // issued. If it's missing, something went wrong upstream — bail out.
  const existingTransaction = await TransactionModel.findOne({
    transactionId: paymentIntent.id,
  });

  if (!existingTransaction) {
    console.error(
      `No Transaction found for PaymentIntent ${paymentIntent.id}. Cannot proceed.`,
    );
    return;
  }

  // Step 4: Stripe can send the same webhook more than once. The Enrollment,
  // not the Transaction's "paid" status, is the source of truth for whether
  // this webhook has already been fully processed — this way a retry can
  // still create the Enrollment if a prior delivery marked the Transaction
  // paid but crashed before the Enrollment was created.
  const existingEnrollment = await EnrollmentModel.findOne({
    student: studentId,
    course: courseId,
  });

  if (existingEnrollment) {
    console.log(`Enrollment for student ${studentId} in course ${courseId} already exists. Skipping.`);
    return;
  }

  // Step 5: Resolve the Stripe charge id off the PaymentIntent
  const stripeChargeId =
    typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id || null;

  // Step 6: Mark the pending Transaction as paid
  existingTransaction.paymentStatus = "paid";
  existingTransaction.amountPaid = totalPrice;
  existingTransaction.amountPaidAt = new Date();
  existingTransaction.adminCommission = adminCommission;
  existingTransaction.instructorRevenue = instructorRevenue;
  existingTransaction.stripeChargeId = stripeChargeId;
  await existingTransaction.save();
  const transaction = existingTransaction;

  // Step 7: Create the Enrollment record, granting course access. The
  // unique (student, course) index guards against a duplicate if two
  // retries race past the check in Step 4.
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
export const handlePaymentIntentFailedService = async (
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> => {
  // Step 1: Load the pending Transaction created when the PaymentIntent was
  // issued. If it's missing, there's nothing to mark as failed.
  const existingTransaction = await TransactionModel.findOne({
    transactionId: paymentIntent.id,
  });

  if (!existingTransaction) {
    console.error(
      `No Transaction found for failed PaymentIntent ${paymentIntent.id}.`,
    );
    return;
  }

  // Step 2: Don't downgrade a Transaction that's already paid/refunded
  if (existingTransaction.paymentStatus !== "pending") {
    console.log(
      `Transaction ${paymentIntent.id} is already ${existingTransaction.paymentStatus}. Skipping.`,
    );
    return;
  }

  // Step 3: Mark the Transaction as failed so the student can retry checkout
  existingTransaction.paymentStatus = "failed";
  await existingTransaction.save();

  console.log(`Transaction ${paymentIntent.id} marked as failed.`);
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
    console.log(
      `Transaction ${transaction.transactionId} already marked as refunded. Skipping.`,
    );
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
