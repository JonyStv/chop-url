import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { linksRouter } from "./routes/links.js";
import { analyticsRouter } from "./routes/analytics.js";
import { redirectRouter } from "./routes/redirect.js";
import { authRouter } from "./routes/auth.js";
import { userRouter } from "./routes/users.js";
import { resendRouter } from "./routes/resend.js";
import plansRouter from "./routes/plans.js";
import subscriptionsRouter from "./routes/subscriptions.js";

import { corsMiddleware } from "./middleware/cors.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import { httpLogger } from "./middleware/httpLogger.js";
import { logger } from "./utils/logger.js";
import { stripeWebhookHandler } from "./controllers/stripeWebhook.js";

const app = express();

app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);

// Security: Trust proxy for Vercel/proxy compatibility
app.set("trust proxy", 1);

// Logging: HTTP request logging
app.use(httpLogger);

// Security: Helmet for HTTP security headers with CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    frameguard: { action: "deny" },
    xssFilter: true,
  }),
);

// Security: CORS with credentials
app.use(corsMiddleware);

// Security: Global rate limiting
app.use(globalLimiter);

// Parsing: JSON with size limit (100kb)
app.use(express.json({ limit: "100kb" }));

// Parsing: Cookie parser
app.use(cookieParser());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use(["/users", "/api/users"], userRouter);
app.use(["/auth", "/api/auth"], authRouter);
app.use(["/links", "/api/links"], linksRouter);
app.use(["/analytics", "/api/analytics"], analyticsRouter);
app.use(["/plans", "/api/plans"], plansRouter);
app.use(["/subscriptions", "/api/subscriptions"], subscriptionsRouter);
app.use(["/resend", "/api/resend"], resendRouter);
app.use("/", redirectRouter);

// Centralized error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Error interno del servidor.";

  logger.error({
    statusCode,
    message,
    method: req.method,
    path: req.path,
    error: err.stack,
  });

  res.status(statusCode).json({ message });
});

export default app;
