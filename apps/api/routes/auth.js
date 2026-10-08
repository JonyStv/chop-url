import { Router } from "express";
import { AuthController } from "../controllers/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { validateRequest, registerSchema, loginSchema, changePasswordSchema } from "../middleware/validation.js";

const router = Router();

router.post("/register", authLimiter, validateRequest(registerSchema), AuthController.register);
router.post("/login", authLimiter, validateRequest(loginSchema), AuthController.login);
router.post("/refresh", authLimiter, AuthController.refresh);
router.post("/logout", AuthController.logout);
router.get("/me", authMiddleware, AuthController.me);
router.get("/session", AuthController.checkSession);
router.patch("/change-password", authMiddleware, validateRequest(changePasswordSchema), AuthController.changePassword);
router.get("/verify-email", AuthController.verifyEmail);
router.post("/resend-verification-email", AuthController.resendVerificationEmail);

export { router as authRouter };
