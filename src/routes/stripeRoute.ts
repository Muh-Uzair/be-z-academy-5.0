import { Router } from "express";
import express from "express";
import { handleStripeWebhook } from "../controllers/stripeController";

const stripeRouter = Router();

// DIVIDER Admin Routes ---------------------------------------------------------

// DIVIDER Instructor Routes ---------------------------------------------------------

// DIVIDER Student Routes ---------------------------------------------------------

// DIVIDER Admin + Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Admin + Instructor Routes ---------------------------------------------------------

// DIVIDER Admin + Student Routes ---------------------------------------------------------

// DIVIDER Instructor + Student Routes ---------------------------------------------------------

// DIVIDER Public Routes ---------------------------------------------------------

// We need the raw body for Stripe signature verification
// (root)/api/v1/stripe/webhook
// Api # 1
stripeRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

export default stripeRouter;
