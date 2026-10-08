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
      isActive: ["active", "trialing", "cancel_at_period_end"].includes(subscription.status),
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
    if (!status || !["active", "trialing", "cancel_at_period_end"].includes(status)) {
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

    const current = await this.getCurrentSubscriptionForUser(user.id);
    if (
      current?.subscription?.cancelAtPeriodEnd &&
      current?.subscription?.stripeSubscriptionId &&
      current?.subscription?.planId === plan.id
    ) {
      await this.reactivateSubscription(user.id);
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
    if (!subscription || !status || !["active", "trialing", "cancel_at_period_end"].includes(status)) {
      throw new AppError("Tu suscripción no está activa.", 403);
    }
    // Si la suscripción está pendiente de cancelación (cancel_at_period_end),
    // el usuario sigue teniendo acceso a los features hasta el fin de periodo.
    return { subscription, plan };
  }

  static async cancelSubscription(usuarioId) {
    const current = await this.getCurrentSubscriptionForUser(usuarioId);
    const subscription = current.subscription;

    // No permitir cancelar si no hay suscripción o ya está cancelada
    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new AppError("No tienes una suscripción activa.", 400);
    }

    // Cancelar en Stripe con efecto al fin de periodo (no inmediato)
    if (stripe) {
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId, {
          invoice_now: false,
          prorate: false,
        });

      } catch (error) {
        console.warn(
          "No se pudo cancelar la suscripción en Stripe; se mantiene el cambio local:",
          error.message,
        );
      }
    }

    // Marcar la suscripción con status "cancel_at_period_end" SIN cambiar el plan.
    // El downgrade a free ocurrirá cuando Stripe envíe customer.subscription.deleted
    // al final del período (o customer.subscription.updated si se anula antes).
    await SubscriptionModel.upsertForUser({
      usuarioId,
      planId: subscription.planId, // mantener el plan actual hasta el fin de periodo
      status: "cancel_at_period_end",
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
      stripeCustomerId: subscription.stripeCustomerId ?? null,
      stripeSubscriptionId: subscription.stripeSubscriptionId ?? null,
      stripePriceId: subscription.stripePriceId ?? null,
    });

    return this.getCurrentSubscriptionForUser(usuarioId);
  }

  /**
   * Cambia el plan de una suscripción activa de Stripe (upgrade/downgrade) sin salir de la app.
   *
   * - prorationBehavior "create_prorations": upgrade inmediato, se cobra la diferencia proporcional.
   * - prorationBehavior "none": el cambio surte efecto al fin de periodo actual (downgrade sin cargo inmediato).
   * - prorationBehavior "always_invoice": fuerza factura con proration incluso si es negativo (crédito).
   */
  static async switchPlan(usuarioId, newPlanId, prorationBehavior = "create_prorations") {
    if (!stripe) {
      throw new AppError("Stripe no está configurado en este entorno.", 500);
    }

    if (!["create_prorations", "none", "always_invoice"].includes(prorationBehavior)) {
      throw new AppError("prorationBehavior no válido", 400);
    }

    const current = await this.getCurrentSubscriptionForUser(usuarioId);
    const subscription = current?.subscription;

    if (!subscription?.stripeSubscriptionId) {
      throw new AppError("No tienes una suscripción activa en Stripe.", 400);
    }

    // Si el usuario quiere bajar al plan gratuito, Stripe no lo soporta via items update.
    // En su lugar, cancelamos (diferida) y aplicamos el plan free localmente.
    const newPlan = await prisma.plan.findUnique({ where: { id: newPlanId } });
    if (!newPlan) {
      throw new AppError("Plan no encontrado.", 404);
    }

    if (newPlan.id === "free" || !newPlan.stripe_price_id) {
      // Downgrade a free: cancelar Stripe subscription con efecto al fin de periodo.
      // NO cambiamos el plan_id localmente todavía — el usuario conserva el plan pagado
      // hasta el fin de periodo. El webhook customer.subscription.deleted rebajará a free.
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId, {
        invoice_now: false,
        prorate: false,
      });

      await SubscriptionModel.upsertForUser({
        usuarioId,
        planId: subscription.planId, // mantener plan pagado hasta fin de periodo
        status: "cancel_at_period_end",
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: true,
        canceledAt: subscription.canceledAt ?? new Date(),
        stripeCustomerId: subscription.stripeCustomerId ?? null,
        stripeSubscriptionId: subscription.stripeSubscriptionId ?? null,
        stripePriceId: subscription.stripePriceId ?? null,
      });

      return this.getCurrentSubscriptionForUser(usuarioId);
    }

    // Upgrade/Downgrade entre planes pagos: actualizar la suscripción de Stripe
    const stripeSub = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [{ price: newPlan.stripe_price_id }],
        cancel_at_period_end: false,
        proration_behavior: prorationBehavior,
      },
    );

    await SubscriptionModel.upsertForUser({
      usuarioId,
      planId: newPlan.id,
      status: stripeSub.status ?? subscription.status,
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      cancelAtPeriodEnd: Boolean(stripeSub.cancel_at_period_end),
      canceledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
      stripeCustomerId: stripeSub.customer ?? subscription.stripeCustomerId,
      stripeSubscriptionId: stripeSub.id ?? subscription.stripeSubscriptionId,
      stripePriceId: newPlan.stripe_price_id,
    });

    return this.getCurrentSubscriptionForUser(usuarioId);
  }
  /**
   * Reactiva una suscripción que estaba programada para cancelarse al final del periodo.
   */
  static async reactivateSubscription(usuarioId) {
    const current = await this.getCurrentSubscriptionForUser(usuarioId);
    const subscription = current?.subscription;

    if (!subscription || !subscription.stripeSubscriptionId || !subscription.cancelAtPeriodEnd) {
      throw new AppError("No hay una cancelación pendiente para reactivar.", 400);
    }

    if (stripe) {
      try {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: false,
        });
      } catch (error) {
        console.warn(
          "No se pudo reactivar la suscripción en Stripe; se intentará actualizar localmente:",
          error.message,
        );
      }
    }

    await SubscriptionModel.upsertForUser({
      usuarioId,
      planId: subscription.planId,
      status: subscription.status ?? "active",
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      stripeCustomerId: subscription.stripeCustomerId ?? null,
      stripeSubscriptionId: subscription.stripeSubscriptionId ?? null,
      stripePriceId: subscription.stripePriceId ?? null,
    });

    return this.getCurrentSubscriptionForUser(usuarioId);
  }
  /**
   * Crea una sesión del Portal de Facturación de Stripe,
   * donde el usuario puede gestionar su método de pago, facturas e historial.
   */
  static async createBillingPortalSession(usuarioId) {
    if (!stripe) {
      throw new AppError("Stripe no está configurado en este entorno.", 500);
    }

    const current = await this.getCurrentSubscriptionForUser(usuarioId);
    const customerId = current?.subscription?.stripeCustomerId;

    if (!customerId) {
      throw new AppError("No tienes un cliente de Stripe asociado.", 400);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.PUBLIC_URL}/settings`,
    });

    return session;
  }
}
