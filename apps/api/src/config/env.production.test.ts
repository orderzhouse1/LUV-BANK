import { describe, expect, it } from "vitest";
import { apiEnvSchema, migrationEnvSchema, webPublicEnvSchema } from "@luv-bank/config";

describe("apiEnvSchema production hardening", () => {
  const base = {
    NODE_ENV: "production",
    API_PUBLIC_URL: "https://api.example.com",
    CORS_ORIGINS: "https://app.example.com",
    PERSISTENCE_DRIVER: "prisma",
    DATABASE_URL: "postgresql://user:pass@host/db?sslmode=require",
    COOKIE_SECURE: "true",
    COOKIE_SAME_SITE: "lax",
    JWT_ACCESS_SECRET: "prod-access-secret-value-32chars!!",
    JWT_REFRESH_SECRET: "prod-refresh-secret-value-32chars!",
    CSRF_SECRET: "prod-csrf-secret-value-32chars!!!!!",
    ACTIVE_SCORING_POLICY: "MVP_EQUAL_WEIGHT_V1",
    ACTIVE_INSIGHT_RULESET: "DESCRIPTIVE_INSIGHTS_V1",
    ACTIVE_NUDGE_RULESET: "GENTLE_NUDGES_V1",
    ACTIVE_SHARE_SNAPSHOT_VERSION: "PRIVATE_SHARE_SNAPSHOT_V1",
  } as const;

  it("accepts a hardened production config without DIRECT_URL", () => {
    const parsed = apiEnvSchema.parse(base);
    expect(parsed.PERSISTENCE_DRIVER).toBe("prisma");
    expect(parsed.COOKIE_SECURE).toBe(true);
    expect(parsed.DIRECT_URL).toBeUndefined();
  });

  it("rejects placeholder secrets in production", () => {
    expect(() =>
      apiEnvSchema.parse({
        ...base,
        JWT_ACCESS_SECRET: "REPLACE_WITH_A_LONG_RANDOM_ACCESS_SECRET_AT_LEAST_32",
      }),
    ).toThrow();
  });

  it("rejects memory persistence in production", () => {
    expect(() =>
      apiEnvSchema.parse({
        ...base,
        PERSISTENCE_DRIVER: "memory",
      }),
    ).toThrow();
  });

  it("rejects http production URLs unless local smoke gate is set", () => {
    expect(() =>
      apiEnvSchema.parse({
        ...base,
        API_PUBLIC_URL: "http://api.example.com",
      }),
    ).toThrow();
  });

  it("allows localhost HTTP only with explicit local smoke gate", () => {
    const parsed = apiEnvSchema.parse({
      ...base,
      API_PUBLIC_URL: "http://127.0.0.1:4000",
      CORS_ORIGINS: "http://localhost:3000",
      COOKIE_SECURE: "false",
      ALLOW_INSECURE_LOCAL_PRODUCTION_SMOKE: "true",
    });
    expect(parsed.ALLOW_INSECURE_LOCAL_PRODUCTION_SMOKE).toBe(true);
  });

  it("rejects wildcard CORS", () => {
    expect(() =>
      apiEnvSchema.parse({
        ...base,
        CORS_ORIGINS: "*",
      }),
    ).toThrow();
  });

  it("rejects CORS origins with paths", () => {
    expect(() =>
      apiEnvSchema.parse({
        ...base,
        CORS_ORIGINS: "https://app.example.com/app",
      }),
    ).toThrow();
  });
});

describe("migrationEnvSchema", () => {
  it("requires DIRECT_URL", () => {
    expect(() => migrationEnvSchema.parse({})).toThrow();
    const parsed = migrationEnvSchema.parse({
      DIRECT_URL: "postgresql://user:pass@host/db?sslmode=require",
    });
    expect(parsed.DIRECT_URL).toContain("postgresql://");
  });
});

describe("webPublicEnvSchema", () => {
  it("requires https in production without local smoke", () => {
    expect(() =>
      webPublicEnvSchema.parse({
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_API_URL: "http://localhost:4000",
      }),
    ).toThrow();
  });
});
