import { Router } from "express";
import { LinkController } from "../controllers/links.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/", LinkController.getAll);
router.get("/:userid", LinkController.getByUserId);
router.post("/", LinkController.create);
router.delete("/:id", authMiddleware, LinkController.delete);
router.put("/:id", LinkController.update);

export { router as linksRouter };
