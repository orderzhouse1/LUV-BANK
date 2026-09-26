import type { ApiEnv } from "@luv-bank/config";
import { apiEnvSchema } from "@luv-bank/config";

function readEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    API_HOST: process.env.API_HOST ?? "0.0.0.0",
    API_PORT: process.env.API_PORT ?? "4000",
    API_PUBLIC_URL: process.env.API_PUBLIC_URL ?? "http://localhost:4000",
    CORS_ORIGINS: process.env.CORS_ORIGINS ?? "http://localhost:3000",
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    PERSISTENCE_DRIVER: process.env.PERSISTENCE_DRIVER ?? "memory",
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
    COOKIE_SECURE: process.env.COOKIE_SECURE ?? "false",
    COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE ?? "lax",
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-value-at-least-32chars",
    JWT_REFRESH_SECRET:
      process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-value-at-least-32chars",
    JWT_ISSUER: process.env.JWT_ISSUER ?? "luv-bank-api",
    JWT_AUDIENCE: process.env.JWT_AUDIENCE ?? "luv-bank-web",
    JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL ?? "15m",
    JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL ?? process.env.REFRESH_TOKEN_TTL ?? "30d",
    CSRF_SECRET: process.env.CSRF_SECRET ?? "dev-csrf-secret-value-at-least-32charsxx",
    AUTH_RATE_LIMIT_WINDOW_MS: process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? "900000",
    AUTH_RATE_LIMIT_MAX: process.env.AUTH_RATE_LIMIT_MAX ?? "10",
    GLOBAL_RATE_LIMIT_WINDOW_MS: process.env.GLOBAL_RATE_LIMIT_WINDOW_MS ?? "60000",
    GLOBAL_RATE_LIMIT_MAX: process.env.GLOBAL_RATE_LIMIT_MAX ?? "300",
    REQUEST_BODY_LIMIT: process.env.REQUEST_BODY_LIMIT ?? "100kb",
    REQUEST_TIMEOUT_MS: process.env.REQUEST_TIMEOUT_MS ?? "30000",
    SHUTDOWN_TIMEOUT_MS: process.env.SHUTDOWN_TIMEOUT_MS ?? "25000",
    TRUST_PROXY_HOPS: process.env.TRUST_PROXY_HOPS ?? "0",
    ALLOW_INSECURE_LOCAL_PRODUCTION_SMOKE:
      process.env.ALLOW_INSECURE_LOCAL_PRODUCTION_SMOKE ?? "false",
    ACTIVE_SCORING_POLICY: process.env.ACTIVE_SCORING_POLICY ?? "MVP_EQUAL_WEIGHT_V1",
    ACTIVE_INSIGHT_RULESET: process.env.ACTIVE_INSIGHT_RULESET ?? "DESCRIPTIVE_INSIGHTS_V1",
    ACTIVE_NUDGE_RULESET: process.env.ACTIVE_NUDGE_RULESET ?? "GENTLE_NUDGES_V1",
    ACTIVE_SHARE_SNAPSHOT_VERSION:
      process.env.ACTIVE_SHARE_SNAPSHOT_VERSION ?? "PRIVATE_SHARE_SNAPSHOT_V1",
  };
}

export function loadEnv(env: NodeJS.ProcessEnv = readEnv()): ApiEnv {
  return apiEnvSchema.parse(env);
}

export type { ApiEnv };
