import Stripe from "stripe";
import { prisma } from "../config/db.js";
import { SubscriptionModel } from "../models/subscription.js";
import { AppError } from "../utils/errors.js";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-08-26.dahlia",
    })
  : null;

const normalizeNumber = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  return Number(value);
};

const normalizePlanResponse = (plan) => {
  if (!plan) {
    return null;
  }

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: Number(plan.price),
    currency: plan.currency,
    billingInterval: plan.billing_interval,
    maxLinks: plan.max_links,
    maxClicksPerMonth: normalizeNumber(plan.max_clicks_per_month),
    analyticsRetentionDays: plan.analytics_retention_days,
    customSlug: plan.custom_slug,
    customDomain: plan.custom_domain,
    apiAccess: plan.api_access,
    removeBranding: plan.remove_branding,
    exportData: plan.export_data,
    supportLevel: plan.support_level,
    stripePriceId: plan.stripe_price_id,
    isActive: plan.is_active,
  };
};

export class SubscriptionService {
  static async getCurrentSubscriptionForUser(usuarioId) {
    const subscription =
      (await SubscriptionModel.getByUserId(usuarioId)) ||
      (await SubscriptionModel.ensureDefaultFreeSubscription(usuarioId));

    if (!subscription) {
      return {
        subscription: null,
        plan: null,
        isActive: false,
        features: {},
        usage: {},
      };
    }

    const plan =
      subscription.plan ||
      (await prisma.plan.findUnique({
        where: { id: subscription.plan_id },
      }));

    const usageCounter = await prisma.usage_counter.findMany({
      where: {
        usuario_id: usuarioId,
      },
    });

    return {
      subscription: {
        id: subscription.id,
        usuarioId: subscription.usuario_id,
        planId: subscription.plan_id,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at,
        stripeCustomerId: subscription.stripe_customer_id,
        stripeSubscriptionId: subscription.stripe_subscription_id,
        stripePriceId: subscription.stripe_price_id,
        createdAt: subscription.created_at,
        updatedAt: subscription.updated_at,
      },
      plan: normalizePlanResponse(plan),
      isActive: ["active", "trialing"].includes(subscription.status),
      features: plan
        ? {
            maxLinks: plan.max_links,
            maxClicksPerMonth: normalizeNumber(plan.max_clicks_per_month),
            analyticsRetentionDays: plan.analytics_retention_days,
            customSlug: plan.custom_slug,
            customDomain: plan.custom_domain,
            apiAccess: plan.api_access,
            removeBranding: plan.remove_branding,
            exportData: plan.export_data,
            supportLevel: plan.support_level,
          }
        : {},
      usage: usageCounter.reduce((acc, item) => {
        acc[item.metric] = normalizeNumber(item.value);
        return acc;
      }, {}),
    };
  }

  static async syncSubscriptionFromStripe({
    usuarioId,
    planId,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    canceledAt,
    stripeCustomerId,
    stripeSubscriptionId,
    stripePriceId,
  }) {
    const subscription = await SubscriptionModel.upsertForUser({
      usuarioId,
      planId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      canceledAt,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
    });

    return this.getCurrentSubscriptionForUser(usuarioId);
  }

  static async canCreateLink(usuarioId) {
    if (typeof usuarioId !== "string" || !usuarioId.trim()) {
      return true;
    }

    const { plan, subscription } =
      await this.getCurrentSubscriptionForUser(usuarioId);

    if (!plan) {
      return false;
    }

    if (plan.maxLinks === null || plan.maxLinks === undefined) {
      return true;
    }

    const status = subscription?.status;
    if (!status || !["active", "trialing"].includes(status)) {
      return false;
    }

    const user = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { enlaces_creados: true },
    });

    if (!user) {
      return false;
    }

    return user.enlaces_creados < plan.maxLinks;
  }

  static async recordUsage(usuarioId, metric, amount = 1) {
    return await SubscriptionModel.incrementUsage(usuarioId, metric, amount);
  }

  static async getPlanFeatures(usuarioId) {
    const { plan, isActive } =
      await this.getCurrentSubscriptionForUser(usuarioId);

    return {
      plan,
      isActive,
      features: plan
        ? {
            maxLinks: plan.maxLinks,
            maxClicksPerMonth: plan.maxClicksPerMonth,
            analyticsRetentionDays: plan.analyticsRetentionDays,
            customSlug: plan.customSlug,
            customDomain: plan.customDomain,
            apiAccess: plan.apiAccess,
            removeBranding: plan.removeBranding,
            exportData: plan.exportData,
            supportLevel: plan.supportLevel,
          }
        : {},
    };
  }
  static async createCheckoutSession({ user, planId }) {
    if (!stripe) {
      throw new AppError("Stripe no está configurado en este entorno.", 500);
    }
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || (!plan.stripe_price_id && plan.id !== "free")) {
      throw new AppError("Plan no disponible", 400);
    }
    if (plan.id === "free") {
      await SubscriptionModel.upsertForUser({
        usuarioId: user.id,
        planId: "free",
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
      });
      return { url: `${process.env.PUBLIC_URL}/settings` };
    }
    return stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      metadata: { userId: user.id, planId: plan.id },
      subscription_data: {
        metadata: { userId: user.id, planId: plan.id },
      },
      success_url: `${process.env.PUBLIC_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.PUBLIC_URL}/billing/cancel`,
    });
  }

  static async confirmCheckoutSession({ sessionId, userId }) {
    if (!stripe) {
      throw new AppError("Stripe no está configurado en este entorno.", 500);
    }

    if (!sessionId) {
      throw new AppError("Falta el identificador de la sesión de Stripe.", 400);
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const stripeSubscription =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;

    if (!stripeSubscription) {
      throw new AppError("No se pudo recuperar la suscripción de Stripe.", 400);
    }

    const resolvedUserId = session.metadata?.userId || userId;
    const resolvedPlanId = session.metadata?.planId || "free";

    const stripePriceId =
      stripeSubscription.items?.data?.[0]?.price?.id ??
      (await prisma.plan.findFirst({ where: { id: resolvedPlanId } }))
        ?.stripe_price_id ??
      null;

    const plan = stripePriceId
      ? await prisma.plan.findUnique({
          where: { stripe_price_id: stripePriceId },
        })
      : await prisma.plan.findUnique({ where: { id: resolvedPlanId } });

    const finalPlanId = plan?.id ?? resolvedPlanId;

    await SubscriptionModel.upsertForUser({
      usuarioId: resolvedUserId,
      planId: finalPlanId,
      status: stripeSubscription.status ?? "active",
      currentPeriodStart: stripeSubscription.items.data[0].current_period_start
        ? new Date(stripeSubscription.items.data[0].current_period_start * 1000)
        : null,
      currentPeriodEnd: stripeSubscription.items.data[0].current_period_end
        ? new Date(stripeSubscription.items.data[0].current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
      canceledAt: stripeSubscription.canceled_at
        ? new Date(stripeSubscription.canceled_at * 1000)
        : null,
      stripeCustomerId: stripeSubscription.customer || session.customer,
      stripeSubscriptionId: stripeSubscription.id || session.subscription,
      stripePriceId,
    });

    return this.getCurrentSubscriptionForUser(resolvedUserId);
  }
  static async assertActivePlan(usuarioId) {
    const { subscription, plan } =
      await this.getCurrentSubscriptionForUser(usuarioId);
    if (!plan) {
      throw new AppError("No tienes un plan activo.", 403);
    }
    const status = subscription?.status;
    if (!subscription || !status || !["active", "trialing"].includes(status)) {
      throw new AppError("Tu suscripción no está activa.", 403);
    }
    if (subscription.cancelAtPeriodEnd) {
      throw new AppError("Tu suscripción está pendiente de cancelación.", 403);
    }
    return { subscription, plan };
  }

  static async cancelSubscription(usuarioId) {
    const current = await this.getCurrentSubscriptionForUser(usuarioId);
    const subscription = current.subscription;

    const freePlan = await prisma.plan.findUnique({ where: { id: "free" } });
    if (!freePlan) {
      throw new AppError("No existe el plan gratuito.", 500);
    }

    if (subscription?.stripeSubscriptionId && stripe) {
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      } catch (error) {
        console.warn(
          "No se pudo cancelar la suscripción en Stripe; se mantiene el cambio local:",
          error.message,
        );
      }
    }

    const now = new Date();

    await SubscriptionModel.upsertForUser({
      usuarioId,
      planId: "free",
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      canceledAt: now,
      stripeCustomerId: subscription?.stripeCustomerId ?? null,
      stripeSubscriptionId: subscription?.stripeSubscriptionId ?? null,
      stripePriceId: freePlan.stripe_price_id ?? null,
    });

    return this.getCurrentSubscriptionForUser(usuarioId);
  }
}
