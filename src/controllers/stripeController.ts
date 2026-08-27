import { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "../config/stripe";
import { env } from "../config/env";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/appError";
import sendResponse from "../utils/sendResponse";
import {
  handleAccountUpdatedEventService,
  handlePaymentIntentSucceededService,
  handleChargeRefundedService,
} from "../services/stripeService";

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
    } else if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log("Payment intent succeeded:", paymentIntent.id);
      await handlePaymentIntentSucceededService(paymentIntent);
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      console.log("Charge refunded:", charge.id);
      await handleChargeRefundedService(charge);
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
