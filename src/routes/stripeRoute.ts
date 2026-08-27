import { Router } from "express";
import express from "express";
import { handleStripeWebhook } from "../controllers/stripeController";

const stripeRouter = Router();

// We need the raw body for Stripe signature verification
stripeRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

export default stripeRouter;
