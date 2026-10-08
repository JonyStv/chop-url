import * as authService from "../services/auth.js";
import { env } from "../config/env.js";
import * as emailService from "../services/email.js";

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
};
export class AuthController {
  static async register(req, res, next) {
    try {
      const { username, nombre, password, email } = req.body;
      const nameToUse = nombre || username;
      const ip = req.ip || req.socket.remoteAddress || "";
      const dispositivo = req.headers["user-agent"] || "";      
      const { user, accessToken, refreshToken, rawToken } = await authService.register({
        email,
        password,
        nombre: nameToUse,
        ip,
        dispositivo,
      });

      if (!email || !nameToUse || !password) {
        return res
          .status(400)
          .json({ message: "Email, nombre y contraseña son obligatorios." });
      }
      await emailService.sendVerification(user.email, user.nombre, rawToken)
      .catch(err => console.error("Error sending verification email:", err));


      

      res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTS);
      res.status(201).json({ user, accessToken });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email y contraseña son obligatorios." });
      }

      const ip = req.ip || req.socket.remoteAddress || "";
      const dispositivo = req.headers["user-agent"] || "";

      const { user, accessToken, refreshToken } = await authService.login({
        email,
        password,
        ip,
        dispositivo,
      });

      res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTS);
      res.status(200).json({ user, accessToken });
    } catch (error) {
      console.error("Error en login:", error);
      next(error);
    }
  }
  static async verifyEmail(req, res, next) {
    const { token } = req.query;

    if (typeof token !== "string") {
      return res.status(400).json({ message: "Token de verificación inválido." });
    }

    try {
      await authService.verifyEmail(token);
      return res.redirect(`${process.env.FRONTEND_URL}/`);
    } catch (error) {
      console.error("Error verifying email:", error);
      return res.redirect(`${process.env.FRONTEND_URL}/?error=${encodeURIComponent(error.message)}`);
    }
  }
  static async resendVerificationEmail(req, res, next) {
    const {email} = req.body;

    await authService.resendVerificationEmail(email).catch(() => {});

    res.status(200).json({ message: "Si el correo existe, se ha enviado un email de verificación." });
  }
  static async refresh(req, res, next) {
    try {
      const token = req.cookies?.refreshToken;
      const ip = req.ip || req.socket.remoteAddress || "";
      const dispositivo = req.headers["user-agent"] || "";

      const { accessToken, refreshToken } = await authService.refresh(
        token,
        ip,
        dispositivo,
      );

      res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTS);
      res.status(200).json({ accessToken });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      const token = req.cookies?.refreshToken;
      await authService.logout(token);
      res
        .clearCookie("refreshToken", REFRESH_COOKIE_OPTS)
        .status(200)
        .json({ message: "Sesión cerrada correctamente." });
    } catch (error) {
      next(error);
    }
  }

  static async me(req, res) {
    res.status(200).json({ user: req.user });
  }
  static async checkSession(req, res) {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(204).send(); // no hay cookie → sin body

    res.status(200).json({ hasSession: true });
  }
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      const ip = req.ip || req.socket.remoteAddress || "";
      const dispositivo = req.headers["user-agent"] || "";

      const { accessToken, refreshToken } = await authService.changePassword(
        req.user.id,
        { currentPassword, newPassword },
        { ip, dispositivo },
      );

      res
        .cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTS)
        .status(200)
        .json({
          message: "Contraseña actualizada correctamente.",
          accessToken,
        });
    } catch (err) {
      next(err);
    }
  }
}
