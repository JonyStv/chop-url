import cors from "cors";
import { env } from "../config/env.js";

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true); // Permitir solicitudes sin origen (por ejemplo, desde Postman)
    }
    if (env.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }
    return callback(
      new Error(
        "No permitido por CORS - Origen: " +
          origin +
          " no esta incluido en la lista de permitidos." +
          env.corsOrigins.join(", "),
      ),
    );
  },
  credentials: true,
});
