import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const JWT_ISSUER = "chop-url";
const JWT_AUDIENCE = "chop-url-api";

export const signAccessToken = (payload) =>
  jwt.sign(payload, env.accessTokenSecret, {
    expiresIn: env.accessTokenExpiresIn,
    algorithm: "HS256",
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, env.refreshTokenSecret, {
    expiresIn: env.refreshTokenExpiresIn,
    algorithm: "HS256",
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, env.accessTokenSecret, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

export const verifyRefreshToken = (token) =>
  jwt.verify(token, env.refreshTokenSecret, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
