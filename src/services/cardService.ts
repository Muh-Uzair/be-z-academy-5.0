import Stripe from "stripe";
import { stripe } from "../config/stripe";
import UserModel, { Role } from "../models/userModel";
import AppError from "../utils/appError";
import { SavedCard } from "../response-types/cardResponseTypes";

// Helper to ensure a Stripe Customer exists for the student
const getOrCreateStripeCustomer = async (
  studentId: string,
): Promise<string> => {
  const student = await UserModel.findOne({
    _id: studentId,
    role: Role.Student,
  });

  if (!student) {
    throw new AppError(404, "Student not found");
  }

  if (student.stripeCustomerId) {
    return student.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: student.email,
    name: student.fullName,
    metadata: {
      userId: student._id.toString(),
    },
  });

  student.stripeCustomerId = customer.id;
  await student.save();

  return customer.id;
};

// FUNCTION
export const getSavedCardsService = async (
  studentId: string,
): Promise<{ cards: SavedCard[] }> => {
  const student = await UserModel.findOne({
    _id: studentId,
    role: Role.Student,
  });

  if (!student) {
    throw new AppError(404, "Student not found");
  }

  if (!student.stripeCustomerId) {
    return { cards: [] };
  }

  const customer = await stripe.customers.retrieve(student.stripeCustomerId);

  if (customer.deleted) {
    return { cards: [] };
  }

  let defaultPaymentMethodId =
    customer.invoice_settings?.default_payment_method as string | null;

  const paymentMethods = await stripe.paymentMethods.list({
    customer: student.stripeCustomerId,
    type: "card",
  });

  // If there are cards but no default is set in Stripe, promote the first card to default
  if (!defaultPaymentMethodId && paymentMethods.data.length > 0) {
    defaultPaymentMethodId = paymentMethods.data[0].id;
    await stripe.customers.update(student.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: defaultPaymentMethodId,
      },
    });
  }

  const cards: SavedCard[] = paymentMethods.data.map((pm) => ({
    id: pm.id,
    brand: pm.card?.brand || "unknown",
    last4: pm.card?.last4 || "0000",
    expMonth: pm.card?.exp_month || 0,
    expYear: pm.card?.exp_year || 0,
    isDefault: pm.id === defaultPaymentMethodId,
    cardholderName: pm.billing_details?.name || null,
    funding: pm.card?.funding || null,
    country: pm.card?.country || null,
    createdAt: new Date(pm.created * 1000).toISOString(),
  }));

  return { cards };
};

// FUNCTION
export const createCardSetupIntentService = async (
  studentId: string,
): Promise<{ clientSecret: string | null }> => {
  const stripeCustomerId = await getOrCreateStripeCustomer(studentId);

  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    usage: "off_session",
    metadata: {
      studentId,
    },
  });

  return {
    clientSecret: setupIntent.client_secret,
  };
};

// FUNCTION
export const setDefaultCardService = async (
  studentId: string,
  cardId: string,
): Promise<void> => {
  const student = await UserModel.findOne({
    _id: studentId,
    role: Role.Student,
  });

  if (!student || !student.stripeCustomerId) {
    throw new AppError(404, "Student payment profile not found");
  }

  let paymentMethod: Stripe.PaymentMethod;
  try {
    paymentMethod = await stripe.paymentMethods.retrieve(cardId);
  } catch {
    throw new AppError(404, "Payment card not found");
  }

  if (paymentMethod.customer !== student.stripeCustomerId) {
    throw new AppError(403, "You do not have permission to modify this card");
  }

  await stripe.customers.update(student.stripeCustomerId, {
    invoice_settings: {
      default_payment_method: cardId,
    },
  });
};

// FUNCTION
export const deleteSavedCardService = async (
  studentId: string,
  cardId: string,
): Promise<void> => {
  const student = await UserModel.findOne({
    _id: studentId,
    role: Role.Student,
  });

  if (!student || !student.stripeCustomerId) {
    throw new AppError(404, "Student payment profile not found");
  }

  let paymentMethod: Stripe.PaymentMethod;
  try {
    paymentMethod = await stripe.paymentMethods.retrieve(cardId);
  } catch {
    throw new AppError(404, "Payment card not found");
  }

  if (paymentMethod.customer !== student.stripeCustomerId) {
    throw new AppError(403, "You do not have permission to delete this card");
  }

  await stripe.paymentMethods.detach(cardId);

  // If the deleted card was the default, promote the first remaining card to default
  const customer = await stripe.customers.retrieve(student.stripeCustomerId);

  if (
    !customer.deleted &&
    customer.invoice_settings?.default_payment_method === cardId
  ) {
    const remaining = await stripe.paymentMethods.list({
      customer: student.stripeCustomerId,
      type: "card",
    });

    const newDefaultId = remaining.data[0]?.id;
    if (newDefaultId) {
      await stripe.customers.update(student.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: newDefaultId,
        },
      });
    }
  }
};
