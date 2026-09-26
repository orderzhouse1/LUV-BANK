import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const PLACEHOLDER_PATTERN = /REPLACE|CHANGE_ME|YOUR_SECRET|replace-me|changeme/i;

export function secretLooksPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERN.test(value);
}

export function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}

export function isLocalOriginOrUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return isLocalHostname(url.hostname);
  } catch {
    return false;
  }
}

function assertOriginOnly(origin: string, ctx: z.RefinementCtx, path: (string | number)[]) {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    ctx.addIssue({
      code: "custom",
      path,
      message: "Origin must be a valid absolute URL",
    });
    return;
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    ctx.addIssue({
      code: "custom",
      path,
      message: "CORS origins must not include a path",
    });
  }
  if (url.search || url.hash) {
    ctx.addIssue({
      code: "custom",
      path,
      message: "CORS origins must not include query or hash",
    });
  }
  if (origin.includes("*")) {
    ctx.addIssue({
      code: "custom",
      path,
      message: "Wildcard CORS origins are not allowed",
    });
  }
}

/**
 * API environment. JWT secrets are required at runtime for the API process
 * (tests inject their own values). Empty COOKIE_DOMAIN means host-only cookies.
 *
 * PERSISTENCE_DRIVER:
 * - memory: development/tests only (data resets on process restart)
 * - prisma: real PostgreSQL after migrations
 * Production must use prisma and fails fast on memory.
 *
 * DIRECT_URL is optional for API runtime (pooled DATABASE_URL is enough for Prisma Client).
 * Migration jobs require DIRECT_URL separately.
 */
export const apiEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_HOST: z.string().default("0.0.0.0"),
    API_PORT: z.coerce.number().int().positive().default(4000),
    API_PUBLIC_URL: z.string().url(),
    CORS_ORIGINS: z
      .string()
      .min(1)
      .transform((value) =>
        value
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.string().url()).min(1)),
    DATABASE_URL: z.string().min(1).optional(),
    DIRECT_URL: z.string().min(1).optional(),
    PERSISTENCE_DRIVER: z.enum(["memory", "prisma"]).default("memory"),
    COOKIE_DOMAIN: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    COOKIE_SECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ISSUER: z.string().min(1).default("luv-bank-api"),
    JWT_AUDIENCE: z.string().min(1).default("luv-bank-web"),
    JWT_ACCESS_TTL: z.string().default("15m"),
    JWT_REFRESH_TTL: z.string().default("30d"),
    CSRF_SECRET: z.string().min(32),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    GLOBAL_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    GLOBAL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    REQUEST_BODY_LIMIT: z.string().default("100kb"),
    REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(25_000),
    /**
     * Express trust proxy hops. Never use unconditional `true` in production.
     * `0` disables proxy trust. Positive integers trust that many hops.
     */
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    /**
     * Explicit local-only escape hatch for HTTP container smoke against localhost.
     * Never enable in real production compose templates.
     */
    ALLOW_INSECURE_LOCAL_PRODUCTION_SMOKE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    /**
     * Reviewed scoring policy only.
     * Unknown values fail env validation at startup.
     */
    ACTIVE_SCORING_POLICY: z.enum(["MVP_EQUAL_WEIGHT_V1"]).default("MVP_EQUAL_WEIGHT_V1"),
    /**
     * Reviewed descriptive insight ruleset only.
     * Unknown values fail env validation at startup.
     */
    ACTIVE_INSIGHT_RULESET: z.enum(["DESCRIPTIVE_INSIGHTS_V1"]).default("DESCRIPTIVE_INSIGHTS_V1"),
    /**
     * Reviewed gentle nudge ruleset only.
     * Unknown values fail env validation at startup.
     */
    ACTIVE_NUDGE_RULESET: z.enum(["GENTLE_NUDGES_V1"]).default("GENTLE_NUDGES_V1"),
    /**
     * Reviewed private share snapshot version only.
     * Unknown values fail env validation at startup.
     */
    ACTIVE_SHARE_SNAPSHOT_VERSION: z
      .enum(["PRIVATE_SHARE_SNAPSHOT_V1"])
      .default("PRIVATE_SHARE_SNAPSHOT_V1"),
  })
  .superRefine((env, ctx) => {
    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["JWT_REFRESH_SECRET"],
        message: "JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET",
      });
    }
    if (env.JWT_ACCESS_SECRET === env.CSRF_SECRET || env.JWT_REFRESH_SECRET === env.CSRF_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["CSRF_SECRET"],
        message: "CSRF_SECRET must differ from JWT access and refresh secrets",
      });
    }

    env.CORS_ORIGINS.forEach((origin, index) => {
      assertOriginOnly(origin, ctx, ["CORS_ORIGINS", index]);
    });

    if (env.NODE_ENV === "production" && env.PERSISTENCE_DRIVER === "memory") {
      ctx.addIssue({
        code: "custom",
        path: ["PERSISTENCE_DRIVER"],
        message: "PERSISTENCE_DRIVER=memory is not allowed in production",
      });
    }
    if (env.PERSISTENCE_DRIVER === "prisma" && !env.DATABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required when PERSISTENCE_DRIVER=prisma",
      });
    }

    if (env.NODE_ENV === "production") {
      const secrets: Array<[keyof typeof env, string]> = [
        ["JWT_ACCESS_SECRET", env.JWT_ACCESS_SECRET],
        ["JWT_REFRESH_SECRET", env.JWT_REFRESH_SECRET],
        ["CSRF_SECRET", env.CSRF_SECRET],
      ];
      for (const [name, value] of secrets) {
        if (secretLooksPlaceholder(value)) {
          ctx.addIssue({
            code: "custom",
            path: [name],
            message: `${String(name)} looks like a placeholder and is rejected`,
          });
        }
      }
      const localSmoke = env.ALLOW_INSECURE_LOCAL_PRODUCTION_SMOKE;
      const publicUrlLocal = isLocalOriginOrUrl(env.API_PUBLIC_URL);
      const originsLocal = env.CORS_ORIGINS.every(isLocalOriginOrUrl);

      if (localSmoke) {
        if (!publicUrlLocal || !originsLocal) {
          ctx.addIssue({
            code: "custom",
            path: ["ALLOW_INSECURE_LOCAL_PRODUCTION_SMOKE"],
            message:
              "ALLOW_INSECURE_LOCAL_PRODUCTION_SMOKE is only allowed for localhost/127.0.0.1 URLs and origins",
          });
        }
      } else {
        if (!env.API_PUBLIC_URL.startsWith("https://")) {
          ctx.addIssue({
            code: "custom",
            path: ["API_PUBLIC_URL"],
            message: "Production API_PUBLIC_URL must use https://",
          });
        }
        for (const [index, origin] of env.CORS_ORIGINS.entries()) {
          if (!origin.startsWith("https://")) {
            ctx.addIssue({
              code: "custom",
              path: ["CORS_ORIGINS", index],
              message: "Production CORS origins must use https://",
            });
          }
        }
        if (!env.COOKIE_SECURE) {
          ctx.addIssue({
            code: "custom",
            path: ["COOKIE_SECURE"],
            message: "COOKIE_SECURE must be true in production",
          });
        }
        if (env.COOKIE_SAME_SITE === "none" && !env.COOKIE_SECURE) {
          ctx.addIssue({
            code: "custom",
            path: ["COOKIE_SAME_SITE"],
            message: "COOKIE_SAME_SITE=none requires COOKIE_SECURE=true",
          });
        }
      }

      if (env.PERSISTENCE_DRIVER !== "prisma") {
        ctx.addIssue({
          code: "custom",
          path: ["PERSISTENCE_DRIVER"],
          message: "Production requires PERSISTENCE_DRIVER=prisma",
        });
      }
    }
  });

/**
 * Migration job environment — separate from API runtime.
 * Requires DIRECT_URL for prisma migrate deploy / status.
 */
export const migrationEnvSchema = z.object({
  DIRECT_URL: z
    .string()
    .min(1)
    .refine((value) => !secretLooksPlaceholder(value), {
      message: "DIRECT_URL looks like a placeholder",
    }),
  DATABASE_URL: z.string().min(1).optional(),
});

export const webPublicEnvSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_API_URL: z.string().url(),
    NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(["en", "ar"]).default("en"),
    NEXT_PUBLIC_PWA_ENABLE: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => (value === undefined ? undefined : value === "true")),
    PWA_CACHE_VERSION: z.string().min(1).optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).optional(),
    ALLOW_INSECURE_LOCAL_PRODUCTION_SMOKE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;

    const localSmoke = env.ALLOW_INSECURE_LOCAL_PRODUCTION_SMOKE;
    const appLocal = isLocalOriginOrUrl(env.NEXT_PUBLIC_APP_URL);
    const apiLocal = isLocalOriginOrUrl(env.NEXT_PUBLIC_API_URL);

    if (localSmoke) {
      if (!appLocal || !apiLocal) {
        ctx.addIssue({
          code: "custom",
          path: ["ALLOW_INSECURE_LOCAL_PRODUCTION_SMOKE"],
          message:
            "ALLOW_INSECURE_LOCAL_PRODUCTION_SMOKE is only allowed for localhost/127.0.0.1 web URLs",
        });
      }
      return;
    }

    if (!env.NEXT_PUBLIC_APP_URL.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_APP_URL"],
        message: "Production NEXT_PUBLIC_APP_URL must use https://",
      });
    }
    if (!env.NEXT_PUBLIC_API_URL.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_API_URL"],
        message: "Production NEXT_PUBLIC_API_URL must use https://",
      });
    }
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type MigrationEnv = z.infer<typeof migrationEnvSchema>;
export type WebPublicEnv = z.infer<typeof webPublicEnvSchema>;
