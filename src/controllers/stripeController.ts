import { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "@src/config/stripe";
import { env } from "@src/config/env";
import catchAsync from "@src/utils/catchAsync";
import AppError from "@src/utils/appError";
import { handleAccountUpdatedEventService } from "@src/services/stripeServices";

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
    } else {
      console.log("Unhandled Stripe webhook event type:", event.type);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  },
);
