import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const signAccessToken = (payload) =>
  jwt.sign(payload, env.accessTokenSecret, {
    expiresIn: env.accessTokenExpiresIn,
  });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, env.refreshTokenSecret, {
    expiresIn: env.refreshTokenExpiresIn,
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, env.accessTokenSecret);

export const verifyRefreshToken = (token) =>
  jwt.verify(token, env.refreshTokenSecret);
