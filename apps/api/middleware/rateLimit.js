import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../config/env.js";

// Global rate limiter: 100 requests per 15 minutes
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Demasiadas solicitudes desde esta IP, por favor intente más tarde.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown");
  },
  skip: (req) => env.nodeEnv !== "production",
});

// Strict rate limiter for auth endpoints: 5 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Demasiados intentos de autenticación, por favor intente más tarde.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown");
  },
  skip: (req) => env.nodeEnv !== "production",
});

// Lenient rate limiter for general endpoints: 30 requests per minute
export const lenientLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Demasiadas solicitudes, por favor intente más tarde.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown");
  },
  skip: (req) => env.nodeEnv !== "production",
});
