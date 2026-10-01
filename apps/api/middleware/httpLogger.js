import pinoHttp from "pino-http";
import { logger } from "../utils/logger.js";

export const httpLogger = pinoHttp({
  logger,
  serializers: {
    req(request) {
      return {
        method: request.method,
        url: request.url,
        headers: {
          host: request.headers.host,
          "user-agent": request.headers["user-agent"],
        },
        remoteAddress: request.ip || request.socket?.remoteAddress,
      };
    },
    res(reply) {
      return {
        statusCode: reply.statusCode,
      };
    },
  },
});
