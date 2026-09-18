import { Router } from "express";
import { AnalyticsController } from "../controllers/analytics.js";

const router = Router();

router.get("/:userid/summary", AnalyticsController.getSummary);
router.get("/:userid/summary/:linkid", AnalyticsController.getSummary);
router.get("/:userid", AnalyticsController.getByUserId);

export { router as analyticsRouter };
