import Stripe from "stripe";
import { env } from "@src/config/env";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);
