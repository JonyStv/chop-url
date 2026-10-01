import pino from "pino";
import { env } from "../config/env.js";

const transport =
  env.nodeEnv === "production"
    ? pino.transport({
        target: "pino/file",
      })
    : pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      });

export const logger = pino(
  {
    level: env.logLevel || "info",
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
);

export default logger;
