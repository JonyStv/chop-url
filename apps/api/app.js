import express from "express";
import cookieParser from "cookie-parser";
import { linksRouter } from "./routes/links.js";
import { analyticsRouter } from "./routes/analytics.js";
import { redirectRouter } from "./routes/redirect.js";
import { authRouter } from "./routes/auth.js";
import { userRouter } from "./routes/users.js";

import { corsMiddleware } from "./middleware/cors.js";
import { uaMiddleware } from "./middleware/ua.js";

const app = express();
app.set("trust proxy", true); // Para obtener la IP real del cliente detrás de un proxy
app.use(corsMiddleware);
app.use(uaMiddleware);
app.use(express.json());
app.use(cookieParser());

app.use(["/users", "/api/users"], userRouter);
app.use(["/auth", "/api/auth"], authRouter);
app.use(["/links", "/api/links"], linksRouter);
app.use(["/analytics", "/api/analytics"], analyticsRouter);
app.use("/", redirectRouter);

// Middleware centralizado de manejo de errores
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Error interno del servidor.";
  res.status(statusCode).json({ message });
});

export default app;
