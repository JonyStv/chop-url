import { AnalyticModel } from "../models/analytic.js";

export class AnalyticsController {
  static async getByUserId(req, res) {
    const { userid } = req.params;

    const analytics = await AnalyticModel.getByUserId(userid);
    if (!analytics) {
      res.status(404).json({ error: "Analytics not found" });
    }
    res.json(analytics);
  }

  static async getSummary(req, res) {
    const { userid, linkid } = req.params;
    const { startDate, endDate } = req.query;
    const summary = await AnalyticModel.getSummaryByUserId(userid, linkid, {
      startDate,
      endDate,
    });
    res.json(summary);
  }
}
