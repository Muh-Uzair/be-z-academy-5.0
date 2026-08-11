import { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "@src/config/stripe";
import { env } from "@src/config/env";
import catchAsync from "@src/utils/catchAsync";
import AppError from "@src/utils/appError";
import sendResponse from "@src/utils/sendResponse";
import {
  handleAccountUpdatedEventService,
  handlePaymentIntentSucceededService,
  handleChargeRefundedService,
} from "@src/services/stripeService";
import { deleteCacheByPattern } from "@src/utils/cache";

export const handleStripeWebhook = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      throw new AppError(400, "Missing Stripe signature header");
    }

    let event: Stripe.Event;

    try {
      // req.body must be the raw Buffer
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err: any) {
      console.error(
        "Stripe webhook signature verification failed:",
        err.message,
      );
      throw new AppError(400, "Invalid Stripe webhook signature");
    }

    console.log("Stripe webhook event received:", event.type);

    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      console.log("Account updated:", account.id);
      await handleAccountUpdatedEventService(account);
      
      await deleteCacheByPattern("instructors:*");
    } else if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log("Payment intent succeeded:", paymentIntent.id);
      await handlePaymentIntentSucceededService(paymentIntent);
      
      await deleteCacheByPattern("enrollments:*");
      await deleteCacheByPattern("enrollmentDetails:*");
      await deleteCacheByPattern("transactions:*");
      await deleteCacheByPattern("transactionDetails:*");
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      console.log("Charge refunded:", charge.id);
      await handleChargeRefundedService(charge);

      await deleteCacheByPattern("enrollments:*");
      await deleteCacheByPattern("enrollmentDetails:*");
      await deleteCacheByPattern("transactions:*");
      await deleteCacheByPattern("transactionDetails:*");
    } else {
      console.log("Unhandled Stripe webhook event type:", event.type);
    }

    sendResponse(res, 200, {
      status: "success",
      message: "Webhook event received",
      data: { received: true },
    });
  },
);
