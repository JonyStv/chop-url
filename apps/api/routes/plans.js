import { Router } from "express";
import { PlanModel } from "../models/plan.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const plans = await PlanModel.getAll();

    // Filtramos lo que NO queremos exponer
    const publicPlans = plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      currency: p.currency,
      billingInterval: p.billing_interval,
      features: {
        maxLinks: p.max_links,
        maxClicksPerMonth:
          p.max_clicks_per_month !== null &&
          p.max_clicks_per_month !== undefined
            ? Number(p.max_clicks_per_month)
            : null,
        analyticsRetentionDays: p.analytics_retention_days,
        customSlug: p.custom_slug,
        customDomain: p.custom_domain,
        apiAccess: p.api_access,
        removeBranding: p.remove_branding,
        exportData: p.export_data,
        supportLevel: p.support_level,
      },
    }));

    res.json(publicPlans);
  } catch (error) {
    next(error);
  }
});

export default router;
