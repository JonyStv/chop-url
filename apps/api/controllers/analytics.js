import { AnalyticModel } from "../models/analytic.js";
import { SubscriptionService } from "../services/subscription.js";
import { AppError } from "../utils/errors.js";

export class AnalyticsController {
  static async getByUserId(req, res) {
    const { userid } = req.params;
    if (req.user && req.user.id !== userid) {
      throw new AppError("No puedes consultar analíticas de otro usuario.", 403);
    }
    const usage = await SubscriptionService.getMonthlyClickUsage(userid);
    const analytics = await AnalyticModel.getByUserId(userid, usage.limit);
    if (!analytics) {
      res.status(404).json({ error: "Analytics not found" });
    }
    res.json(analytics);
  }

  static async getSummary(req, res) {
    const { userid, linkid } = req.params;
    if (req.user && req.user.id !== userid) {
      throw new AppError("No puedes consultar analíticas de otro usuario.", 403);
    }
    const usage = await SubscriptionService.getMonthlyClickUsage(userid);
    const { startDate, endDate } = req.query;
    const summary = await AnalyticModel.getSummaryByUserId(userid, linkid, {
      startDate,
      endDate,
      monthlyLimit: usage.limit,
    });
    res.json(summary);
  }
}
