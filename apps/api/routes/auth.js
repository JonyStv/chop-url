import { Router } from "express";
import { AuthController } from "../controllers/auth.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);
router.get("/me", authMiddleware, AuthController.me);
router.get("/session", AuthController.checkSession);
router.patch("/change-password", authMiddleware, AuthController.changePassword);

export { router as authRouter };
