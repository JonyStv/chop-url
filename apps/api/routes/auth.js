import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  me,
  checkSession,
  changePassword,
} from "../controllers/auth.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authMiddleware, me);
router.get("/session", checkSession);
router.patch("/change-password", authMiddleware, changePassword);
// Compatibilidad con clientes que todavía envían el id en la URL. El usuario
// utilizado sigue siendo siempre el del token autenticado.
router.patch("/:id/change-password", authMiddleware, changePassword);

export { router as authRouter };
