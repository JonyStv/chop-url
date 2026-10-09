import Stripe from "stripe";
import { prisma } from "../config/db.js";
import { SubscriptionModel } from "../models/subscription.js";
import { getStripePeriodDates } from "../services/subscription.js";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    })
  : null;

export const stripeWebhookHandler = async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ message: "Stripe no está configurado." });
  }

  const signature = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const existing = await prisma.stripe_event.findUnique({
    where: { id: event.id },
  });

  if (existing) {
    return res.status(200).json({ received: true });
  }

  await prisma.stripe_event.create({
    data: {
      id: event.id,
      type: event.type,
      payload: event,
    },
  });

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;

        const userId = subscription.metadata?.userId;
        if (!userId) {
          return res.status(200).json({ received: true });
        }

        const stripePriceId = subscription.items?.data?.[0]?.price?.id ?? null;

        const plan = stripePriceId
          ? await prisma.plan.findUnique({
              where: { stripe_price_id: stripePriceId },
            })
          : null;

        // Si la suscripción fue eliminada (deleted) y el plan encontrado no es free,
        // rebajar al plan gratuito localmente.
        const planId =
          event.type === "customer.subscription.deleted" &&
          (!plan || plan.id !== "free")
            ? "free"
            : plan?.id ?? "free";

        // Si la suscripción fue cancelada y el plan es free, limpiar los datos de Stripe
        const stripeCustomerId =
          event.type === "customer.subscription.deleted" ? null : subscription.customer;
        const stripeSubscriptionId =
          event.type === "customer.subscription.deleted" ? null : subscription.id;
        const stripePriceIdFinal =
          event.type === "customer.subscription.deleted" ? null : stripePriceId;

        const statusFinal = subscription.cancel_at_period_end
          ? "cancel_at_period_end"
          : subscription.status;

        const { start: currentPeriodStart, end: currentPeriodEnd } =
          getStripePeriodDates(subscription);

        await SubscriptionModel.upsertForUser({
          usuarioId: userId,
          planId,
          status: statusFinal,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
          canceledAt: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000)
            : null,
          stripeCustomerId,
          stripeSubscriptionId,
          stripePriceId: stripePriceIdFinal,
        });

        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object;

        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;

        if (!userId || !planId) {
          return res.status(200).json({ received: true });
        }

        const stripeSubscriptionId = session.subscription;
        const stripeCustomerId = session.customer;

        await SubscriptionModel.upsertForUser({
          usuarioId: userId,
          planId,
          status: "active",
          stripeCustomerId,
          stripeSubscriptionId,
        });

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (!subscriptionId) {
          break;
        }

        const subscription = await prisma.subscription.findFirst({
          where: { stripe_subscription_id: subscriptionId },
        });

        if (!subscription) {
          break;
        }

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "past_due",
            cancel_at_period_end: false,
          },
        });

        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error("Error procesando webhook de Stripe:", error);
    return res.status(500).json({ message: "Webhook processing failed" });
  }

  return res.status(200).json({ received: true });
};
