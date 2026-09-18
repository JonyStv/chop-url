import { Router } from "express";
import { RedirectController } from "../controllers/redirect.js";

const router = Router();

router.get("/:slug", RedirectController.redirect);
export { router as redirectRouter };
