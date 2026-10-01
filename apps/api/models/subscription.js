import { prisma } from "../config/db.js";

export class SubscriptionModel {
  static async syncUserPlanSnapshot(usuarioId, planId) {
    if (!usuarioId || !planId) {
      return null;
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        name: true,
        max_links: true,
      },
    });

    return await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        plan_id: planId,
        plan: plan?.id ?? planId,
        limite_enlaces: plan?.max_links ?? 0,
      },
    });
  }

  static async getByUserId(usuarioId) {
    return await prisma.subscription.findUnique({
      where: { usuario_id: usuarioId },
      include: { plan: true },
    });
  }

  static async getByStripeCustomerId(stripeCustomerId) {
    return await prisma.subscription.findUnique({
      where: { stripe_customer_id: stripeCustomerId },
      include: { plan: true },
    });
  }

  static async getByStripeSubscriptionId(stripeSubscriptionId) {
    return await prisma.subscription.findUnique({
      where: { stripe_subscription_id: stripeSubscriptionId },
      include: { plan: true },
    });
  }

  static async ensureDefaultFreeSubscription(usuarioId) {
    const existing = await this.getByUserId(usuarioId);
    if (existing) {
      return existing;
    }

    const defaultPlan = await prisma.plan.findUnique({
      where: { id: "free" },
    });

    if (!defaultPlan) {
      return null;
    }

    return await prisma.subscription.create({
      data: {
        usuario_id: usuarioId,
        plan_id: defaultPlan.id,
        status: "active",
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancel_at_period_end: false,
      },
      include: { plan: true },
    });
  }

  static async upsertForUser({
    usuarioId,
    planId,
    status = "active",
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd = false,
    canceledAt = null,
    stripeCustomerId = null,
    stripeSubscriptionId = null,
    stripePriceId = null,
  }) {
    const subscription = await prisma.subscription.upsert({
      where: { usuario_id: usuarioId },
      update: {
        plan_id: planId,
        status,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
        canceled_at: canceledAt,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_price_id: stripePriceId,
      },
      create: {
        usuario_id: usuarioId,
        plan_id: planId,
        status,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: cancelAtPeriodEnd,
        canceled_at: canceledAt,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_price_id: stripePriceId,
      },
      include: { plan: true },
    });

    await this.syncUserPlanSnapshot(usuarioId, planId);
    return subscription;
  }

  static async getUsageByUser(usuarioId, metric, period = null) {
    const currentPeriod = period || new Date().toISOString().slice(0, 7);

    return await prisma.usage_counter.findUnique({
      where: {
        usuario_id_period_metric: {
          usuario_id: usuarioId,
          period: currentPeriod,
          metric,
        },
      },
    });
  }

  static async incrementUsage(usuarioId, metric, amount = 1, period = null) {
    const currentPeriod = period || new Date().toISOString().slice(0, 7);
    const incrementValue = BigInt(amount);

    return await prisma.usage_counter.upsert({
      where: {
        usuario_id_period_metric: {
          usuario_id: usuarioId,
          period: currentPeriod,
          metric,
        },
      },
      update: {
        value: {
          increment: incrementValue,
        },
      },
      create: {
        usuario_id: usuarioId,
        period: currentPeriod,
        metric,
        value: incrementValue,
      },
    });
  }
}
