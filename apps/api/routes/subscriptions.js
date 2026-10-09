import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { SubscriptionService } from "../services/subscription.js";

const router = Router();

router.use(authMiddleware);

router.get("/me", async (req, res, next) => {
  try {
    const subscription =
      await SubscriptionService.getCurrentSubscriptionForUser(req.user.id);
    res.json(subscription);
  } catch (error) {
    next(error);
  }
});

router.get("/usage", async (req, res, next) => {
  try {
    const clicks = await SubscriptionService.getMonthlyClickUsage(req.user.id);
    res.json({ clicks });
  } catch (error) {
    next(error);
  }
});

router.get("/features", async (req, res, next) => {
  try {
    const features = await SubscriptionService.getPlanFeatures(req.user.id);
    res.json(features);
  } catch (error) {
    next(error);
  }
});

router.get("/can-create-link", async (req, res, next) => {
  try {
    const allowed = await SubscriptionService.canCreateLink(req.user.id);
    res.json({ allowed });
  } catch (error) {
    next(error);
  }
});

router.post("/cancel", async (req, res, next) => {
  try {
    const result = await SubscriptionService.cancelSubscription(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/reactivate", async (req, res, next) => {
  try {
    const result = await SubscriptionService.reactivateSubscription(req.user.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/checkout", async (req, res, next) => {
  try {
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ message: "Falta planId" });
    }

    const session = await SubscriptionService.createCheckoutSession({
      user: req.user,
      planId,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    next(error);
  }
});

router.patch("/switch", async (req, res, next) => {
  try {
    const { planId, changeTiming } = req.body;
    if (!planId) {
      return res.status(400).json({ message: "Falta planId" });
    }
    if (changeTiming && !["immediate", "period_end"].includes(changeTiming)) {
      return res.status(400).json({ message: "changeTiming no válido" });
    }

    const result = await SubscriptionService.switchPlan(
      req.user.id,
      planId,
      changeTiming,
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/change-preview", async (req, res, next) => {
  try {
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ message: "Falta planId" });
    }

    const result = await SubscriptionService.previewPlanChange(req.user.id, planId);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/billing-portal", async (req, res, next) => {
  try {
    const result = await SubscriptionService.createBillingPortalSession(req.user.id);
    res.json({ url: result.url });
  } catch (error) {
    next(error);
  }
});

router.get("/billing-summary", async (req, res, next) => {
  try {
    const result = await SubscriptionService.getBillingSummary(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/checkout/confirm", async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const result = await SubscriptionService.confirmCheckoutSession({
      sessionId,
      userId: req.user.id,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
