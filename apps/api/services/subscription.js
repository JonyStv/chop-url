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

export const getStripePeriodDates = (stripeSub) => {
  if (!stripeSub) return { start: null, end: null };

  const itemData = stripeSub.items?.data?.[0];

  const startTimestamp = itemData?.current_period_start ?? stripeSub.current_period_start;
  const endTimestamp = itemData?.current_period_end ?? stripeSub.current_period_end;

  return {
    start: startTimestamp ? new Date(startTimestamp * 1000) : null,
    end: endTimestamp ? new Date(endTimestamp * 1000) : null,
  };
};

const getProratedCreditCents = ({ currentPrice, newPrice, periodStart, periodEnd }) => {
  const periodStartMs = periodStart?.getTime() ?? Date.now();
  const periodEndMs = periodEnd?.getTime() ?? Date.now();
  const remainingMs = Math.max(0, periodEndMs - Date.now());
  const periodMs = Math.max(1, periodEndMs - periodStartMs);

  return Math.floor(((currentPrice - newPrice) * 100 * remainingMs) / periodMs);
};

const getSingleSubscriptionItemsUpdate = (
  stripeSubscription,
  preferredPriceId = null,
  replacementPrice = null,
) => {
  const items = stripeSubscription.items?.data ?? [];
  if (!items.length) {
    throw new AppError("La suscripción de Stripe no tiene elementos de precio.", 409);
  }

  const currentItem =
    items.find((item) => item.price?.id === preferredPriceId) ??
    items[0];

  return items.map((item) =>
    item.id === currentItem.id
      ? {
          id: item.id,
          ...(replacementPrice ? { price: replacementPrice } : {}),
        }
      : { id: item.id, deleted: true },
  );
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
    let scheduledChange = null;

    if (stripe && subscription.stripe_subscription_id) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripe_subscription_id,
          { expand: ["schedule"] },
        );
        const schedule =
          stripeSubscription.schedule &&
          typeof stripeSubscription.schedule !== "string"
            ? stripeSubscription.schedule
            : null;
        const nextPhase = schedule?.phases?.find(
          (phase) =>
            phase.start_date > Math.floor(Date.now() / 1000) &&
            phase.items?.[0]?.price,
        );
        const nextPriceId =
          typeof nextPhase?.items?.[0]?.price === "string"
            ? nextPhase.items[0].price
            : nextPhase?.items?.[0]?.price?.id;

        if (nextPhase && nextPriceId && nextPriceId !== subscription.stripe_price_id) {
          const nextPlan = await prisma.plan.findFirst({
            where: { stripe_price_id: nextPriceId },
          });
          if (nextPlan) {
            scheduledChange = {
              planId: nextPlan.id,
              planName: nextPlan.name,
              price: Number(nextPlan.price),
              currency: nextPlan.currency,
              effectiveAt: new Date(nextPhase.start_date * 1000),
            };
          }
        }
      } catch (error) {
        console.warn(
          "No se pudo consultar el cambio de plan programado en Stripe:",
          error.message,
        );
      }
    }

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
      scheduledChange,
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

  static async getMonthlyClickUsage(usuarioId) {
    const current = await this.getCurrentSubscriptionForUser(usuarioId);
    const period = new Date().toISOString().slice(0, 7);
    const [periodStartYear, periodStartMonth] = period.split("-").map(Number);
    const periodStart = new Date(Date.UTC(periodStartYear, periodStartMonth - 1, 1));
    const periodEnd = new Date(Date.UTC(periodStartYear, periodStartMonth, 1));
    const recordedClicks = await prisma.analitica.count({
      where: {
        usuario_id: usuarioId,
        timestamp: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
    });
    const limit = current.plan?.maxClicksPerMonth ?? null;
    const unlimited = limit === null || limit === undefined;
    const currentClicks = unlimited
      ? recordedClicks
      : Math.min(recordedClicks, Number(limit));

    return {
      period,
      current: currentClicks,
      limit: unlimited ? null : Number(limit),
      remaining: unlimited ? null : Math.max(0, Number(limit) - currentClicks),
      percentage: unlimited
        ? 0
        : Math.min(100, Math.round((currentClicks / Number(limit)) * 100)),
      unlimited,
      reached: !unlimited && recordedClicks >= Number(limit),
      hasHiddenClicks: !unlimited && recordedClicks > Number(limit),
      planId: current.plan?.id ?? "free",
    };
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

    const { start: currentPeriodStart, end: currentPeriodEnd } =
      getStripePeriodDates(stripeSubscription);

    await SubscriptionModel.upsertForUser({
      usuarioId: resolvedUserId,
      planId: finalPlanId,
      status: stripeSubscription.status ?? "active",
      currentPeriodStart,
      currentPeriodEnd,
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
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId,
          { expand: ["schedule"] },
        );
        const schedule =
          stripeSubscription.schedule &&
          typeof stripeSubscription.schedule !== "string"
            ? stripeSubscription.schedule
            : stripeSubscription.schedule
              ? await stripe.subscriptionSchedules.retrieve(
                  stripeSubscription.schedule,
                )
              : null;
        if (schedule) {
          await stripe.subscriptionSchedules.release(schedule.id);
        }
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
          proration_behavior: "none",
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
   * Paid plan changes can be immediate (with proration) or scheduled for period end.
   */
  static async previewPlanChange(usuarioId, newPlanId) {
      const current = await this.getCurrentSubscriptionForUser(usuarioId);
      const subscription = current?.subscription;
      const currentPlan = current?.plan;
      const newPlan = await prisma.plan.findUnique({ where: { id: newPlanId } });

      if (!newPlan) {
        throw new AppError("Plan no encontrado.", 404);
      }
      if (!currentPlan || newPlan.id === subscription?.planId) {
        throw new AppError("El plan seleccionado ya es el plan actual.", 400);
  }

      const currentPrice = Number(currentPlan.price ?? 0);
      const newPrice = Number(newPlan.price ?? 0);
      const isFreeTarget = newPlan.id === "free" || !newPlan.stripe_price_id;
      const isPaidChange = currentPrice > 0 && newPrice > 0;
      const isUpgrade = newPrice > currentPrice;
      const creditCents = getProratedCreditCents({
        currentPrice,
        newPrice,
        periodStart: subscription?.currentPeriodStart,
        periodEnd: subscription?.currentPeriodEnd,
      });
      const periodEnd = subscription?.currentPeriodEnd ?? null;
      const sameScheduledPlan =
        current.scheduledChange?.planId === newPlan.id;

      let paymentMethod = null;
      if (stripe && subscription?.stripeCustomerId) {
        const customer = await stripe.customers.retrieve(
          subscription.stripeCustomerId,
          { expand: ["invoice_settings.default_payment_method"] },
        );
        const method = customer.deleted
          ? null
          : customer.invoice_settings?.default_payment_method;
        if (method && typeof method !== "string") {
          paymentMethod = {
            type: method.type,
            brand: method.card?.brand ?? null,
            last4: method.card?.last4 ?? null,
            expiryMonth: method.card?.exp_month ?? null,
            expiryYear: method.card?.exp_year ?? null,
            bankName: method.us_bank_account?.bank_name ?? null,
            accountType: method.us_bank_account?.account_type ?? null,
          };
        }
      }

      return {
        currentPlan: {
          name: currentPlan.name,
          price: currentPrice,
          currency: currentPlan.currency,
        },
        newPlan: {
          name: newPlan.name,
          price: newPrice,
          currency: newPlan.currency,
        },
        isUpgrade,
        isPaidChange,
        isFreeTarget,
        currentPeriodEnd: periodEnd,
        immediate: {
          amount: isPaidChange && isUpgrade ? Math.max(0, -creditCents) : 0,
          creditAmount: isPaidChange && !isUpgrade ? Math.max(0, creditCents) : 0,
          currency: newPlan.currency,
          description: isPaidChange
            ? "Prorrateo estimado por el tiempo restante del ciclo actual."
            : "El cambio al plan gratuito se aplica al finalizar el ciclo actual.",
        },
        periodEnd: {
          amount: 0,
          creditAmount: Math.max(0, creditCents),
          currency: newPlan.currency,
          nextRecurringAmount: newPrice,
          nextRecurringAmountCents: Math.round(newPrice * 100),
          description: isFreeTarget
            ? "La suscripción terminará al finalizar el ciclo actual."
            : "El nuevo plan comenzará al iniciar el siguiente ciclo.",
        },
        paymentMethod,
        stripePreviewAvailable: Boolean(subscription?.stripeSubscriptionId),
        canSchedule:
          Boolean(subscription?.stripeSubscriptionId) && !sameScheduledPlan,
        sameScheduledPlan,
      };
    }

  static async switchPlan(usuarioId, newPlanId, changeTiming = null) {
    if (!stripe) {
      throw new AppError("Stripe no está configurado en este entorno.", 500);
    }

    const current = await this.getCurrentSubscriptionForUser(usuarioId);
    const subscription = current?.subscription;

    const newPlan = await prisma.plan.findUnique({ where: { id: newPlanId } });
    if (!newPlan) {
      throw new AppError("Plan no encontrado.", 404);
    }

    // Si el usuario no tiene una suscripción activa en Stripe (ej: es un usuario nuevo en plan free)
    if (!subscription?.stripeSubscriptionId) {
      if (newPlan.id === "free" || !newPlan.stripe_price_id) {
        await SubscriptionModel.upsertForUser({
          usuarioId,
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
        return this.getCurrentSubscriptionForUser(usuarioId);
      }

      // Si quiere contratar un plan de pago por primera vez, creamos una sesión de Checkout en Stripe
      const dbUser = await prisma.usuario.findUnique({ where: { id: usuarioId } });
      const session = await this.createCheckoutSession({
        user: dbUser,
        planId: newPlan.id,
      });

      return { url: session.url };
    }

    const currentPlan = current.plan;
    const currentPrice = Number(currentPlan?.price ?? 0);
    const newPrice = Number(newPlan.price);

    if (newPlan.id === subscription.planId) {
      throw new AppError("Ya tienes este plan.", 400);
    }

    const isFreeDowngrade = newPlan.id === "free" || !newPlan.stripe_price_id;
    const isPaidPlanChange = !isFreeDowngrade && currentPrice > 0;
    const effectiveTiming = changeTiming ?? (newPrice > currentPrice ? "immediate" : "period_end");

    if (!["immediate", "period_end"].includes(effectiveTiming)) {
      throw new AppError("Momento de cambio no válido.", 400);
    }

    if (isFreeDowngrade && effectiveTiming !== "period_end") {
      throw new AppError("El cambio al plan gratuito solo puede hacerse al final del ciclo.", 400);
    }

    if (current.scheduledChange?.planId === newPlan.id && effectiveTiming === "period_end") {
      throw new AppError(
        "Este cambio de plan ya está programado para el final del ciclo. Puedes aplicarlo ahora si lo deseas.",
        409,
      );
    }

    if (effectiveTiming === "immediate" && isPaidPlanChange) {
      const stripeCurrent = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId,
        { expand: ["items.data.price"] },
      );
      const scheduledSubscription =
        stripeCurrent.schedule &&
        typeof stripeCurrent.schedule !== "string"
          ? stripeCurrent.schedule
          : null;
      if (scheduledSubscription) {
        await stripe.subscriptionSchedules.release(scheduledSubscription.id);
      }
      const currentSubscription = scheduledSubscription
        ? await stripe.subscriptions.retrieve(
            subscription.stripeSubscriptionId,
            { expand: ["items.data.price"] },
          )
        : stripeCurrent;
      const stripeSub = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          items: getSingleSubscriptionItemsUpdate(
            currentSubscription,
            subscription.stripePriceId,
            newPlan.stripe_price_id,
          ),
          cancel_at_period_end: false,
          proration_behavior: "always_invoice",
          payment_behavior: "error_if_incomplete",
        },
      );

      const { start: currentPeriodStart, end: currentPeriodEnd } =
        getStripePeriodDates(stripeSub);

      await SubscriptionModel.upsertForUser({
        usuarioId,
        planId: newPlan.id,
        status: stripeSub.status ?? subscription.status,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: Boolean(stripeSub.cancel_at_period_end),
        canceledAt: stripeSub.canceled_at
          ? new Date(stripeSub.canceled_at * 1000)
          : null,
        stripeCustomerId: stripeSub.customer ?? subscription.stripeCustomerId,
        stripeSubscriptionId: stripeSub.id ?? subscription.stripeSubscriptionId,
        stripePriceId: newPlan.stripe_price_id,
      });

      return this.getCurrentSubscriptionForUser(usuarioId);
    }

    // Downgrading to free is always a deferred cancellation, not an immediate cancel.
    if (isFreeDowngrade) {
      const stripeCurrent = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId,
        { expand: ["items.data.price"] },
      );
      const stripeSub = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          items: getSingleSubscriptionItemsUpdate(
            stripeCurrent,
            subscription.stripePriceId,
          ),
          cancel_at_period_end: true,
          proration_behavior: "none",
        },
      );

      const creditCents = getProratedCreditCents({
        currentPrice,
        newPrice,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
      });
      if (creditCents > 0 && subscription.stripeCustomerId) {
        await stripe.customers.createBalanceTransaction(
          subscription.stripeCustomerId,
          {
            amount: -creditCents,
            currency: (newPlan.currency || currentPlan.currency || "EUR").toLowerCase(),
            description: "Crédito por downgrade diferido al plan gratuito",
          },
          {
            idempotencyKey: `downgrade-credit-${subscription.stripeSubscriptionId}-${subscription.currentPeriodEnd?.getTime()}-${newPlan.id}`,
          },
        );
      }

      const { start: currentPeriodStart, end: currentPeriodEnd } =
        getStripePeriodDates(stripeSub);

      await SubscriptionModel.upsertForUser({
        usuarioId,
        planId: subscription.planId,
        status: "cancel_at_period_end",
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: true,
        canceledAt: stripeSub.canceled_at
          ? new Date(stripeSub.canceled_at * 1000)
          : new Date(),
        stripeCustomerId: stripeSub.customer ?? subscription.stripeCustomerId,
        stripeSubscriptionId: stripeSub.id ?? subscription.stripeSubscriptionId,
        stripePriceId: subscription.stripePriceId,
      });

      return {
        ...(await this.getCurrentSubscriptionForUser(usuarioId)),
        creditAmount: creditCents > 0 ? creditCents / 100 : 0,
        creditCurrency: newPlan.currency || currentPlan.currency || "EUR",
      };
    }

    if (!isPaidPlanChange) {
      throw new AppError("No se puede cambiar este plan en el momento solicitado.", 409);
    }

    // Keep the current plan active and schedule the paid change for the next cycle.
    if (!subscription.stripePriceId) {
      throw new AppError("La suscripción actual no tiene un precio de Stripe válido.", 409);
    }

    const stripeSub = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
      { expand: ["schedule", "items.data.price"] },
    );
    const normalizedItems = getSingleSubscriptionItemsUpdate(
      stripeSub,
      subscription.stripePriceId,
    );
    if (normalizedItems.length > 1) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: normalizedItems,
        proration_behavior: "none",
      });
    }
    let schedule = stripeSub.schedule;
    if (!schedule) {
      schedule = await stripe.subscriptionSchedules.create({
        from_subscription: subscription.stripeSubscriptionId,
      });
    } else if (typeof schedule === "string") {
      schedule = await stripe.subscriptionSchedules.retrieve(schedule);
    }

    const periodStart = Math.floor(
      (subscription.currentPeriodStart?.getTime() ?? Date.now()) / 1000,
    );
    const periodEnd = Math.floor(
      (subscription.currentPeriodEnd?.getTime() ?? Date.now()) / 1000,
    );

    await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: "release",
      phases: [
        {
          items: [{ price: subscription.stripePriceId, quantity: 1 }],
          start_date: periodStart,
          end_date: periodEnd,
        },
        {
          items: [{ price: newPlan.stripe_price_id, quantity: 1 }],
        },
      ],
    });

    const creditCents = getProratedCreditCents({
      currentPrice,
      newPrice,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
    });

    if (creditCents > 0 && subscription.stripeCustomerId) {
      await stripe.customers.createBalanceTransaction(
        subscription.stripeCustomerId,
        {
          amount: -creditCents,
          currency: (newPlan.currency || current.plan.currency || "EUR").toLowerCase(),
          description: `Crédito por downgrade diferido a ${newPlan.name}`,
        },
        {
          idempotencyKey: `downgrade-credit-${subscription.stripeSubscriptionId}-${periodEnd}-${newPlan.id}`,
        },
      );
    }

    return {
      ...(await this.getCurrentSubscriptionForUser(usuarioId)),
      changeScheduled: true,
      downgradeScheduled: newPrice < currentPrice,
      scheduledPlanId: newPlan.id,
      effectiveAt: subscription.currentPeriodEnd,
      creditAmount: creditCents > 0 ? creditCents / 100 : 0,
      creditCurrency: newPlan.currency || current.plan.currency || "EUR",
    };
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
          status: "active",
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
      status: "active",
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

  static async getBillingSummary(usuarioId) {
    if (!stripe) {
      throw new AppError("Stripe no está configurado en este entorno.", 500);
    }

    const current = await this.getCurrentSubscriptionForUser(usuarioId);
    const subscription = current?.subscription;
    if (!subscription?.stripeCustomerId) {
      return {
        balance: 0,
        currency: current?.plan?.currency ?? "EUR",
        invoices: [],
        nextPayment: null,
      };
    }

    const customer = await stripe.customers.retrieve(subscription.stripeCustomerId);
    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 12,
    });

    let nextPayment = null;
    if (subscription.stripeSubscriptionId && !subscription.cancelAtPeriodEnd) {
      try {
        const preview = await stripe.invoices.createPreview({
          customer: subscription.stripeCustomerId,
          subscription: subscription.stripeSubscriptionId,
        });
        nextPayment = {
          amount: preview.amount_due,
          currency: preview.currency,
          date: preview.due_date ?? preview.period_end ?? null,
          status: "upcoming",
        };
      } catch (error) {
        console.warn("No se pudo obtener la próxima factura:", error.message);
      }
    }

    return {
      balance: customer.deleted ? 0 : customer.balance ?? 0,
      currency: current?.plan?.currency ?? "EUR",
      invoices: invoices.data.map((invoice) => ({
        id: invoice.id,
        amount: invoice.amount_paid ?? invoice.amount_due ?? 0,
        currency: invoice.currency,
        date: invoice.status_transitions?.paid_at ?? invoice.created,
        dueDate: invoice.due_date,
        status: invoice.status,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      })),
      nextPayment,
    };
  }
}
