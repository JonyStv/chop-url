const isProduction = process.env.NODE_ENV === "production";

const splitValues = (value = "") =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://www.stvdev.com",
];

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  publicUrl: process.env.PUBLIC_URL || "http://localhost:3000",
  corsOrigins: splitValues(process.env.CORS_ORIGINS).length
    ? splitValues(process.env.CORS_ORIGINS)
    : defaultOrigins,
  accessTokenSecret:
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SECRET ||
    "local_access_secret_change_me",
  refreshTokenSecret:
    process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_SECRET ||
    "local_refresh_secret_change_me",
  accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  cookieSecure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : isProduction,
  cookieSameSite:
    process.env.COOKIE_SAME_SITE || (isProduction ? "none" : "lax"),
};

if (
  isProduction &&
  (env.accessTokenSecret.includes("change_me") ||
    env.refreshTokenSecret.includes("change_me"))
) {
  throw new Error(
    "JWT_ACCESS_SECRET y JWT_REFRESH_SECRET deben configurarse en producción.",
  );
}
