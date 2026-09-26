import type { RequestHandler } from "express";
import {
  healthResponseSchema,
  readinessResponseSchema,
  type HealthResponse,
  type ReadinessResponse,
} from "@luv-bank/validation";
import type { PrismaClient } from "@luv-bank/database";
import type { ApiEnv } from "../../config/env";

export type HealthDeps = {
  env: ApiEnv;
  prisma: PrismaClient | null;
  isShuttingDown: () => boolean;
};

export function getLiveness(): HealthResponse {
  return healthResponseSchema.parse({
    status: "ok",
    service: "luv-bank-api",
    timestamp: new Date().toISOString(),
  });
}

export async function getReadiness(deps: HealthDeps): Promise<ReadinessResponse> {
  if (deps.isShuttingDown()) {
    return readinessResponseSchema.parse({
      status: "not_ready",
      service: "luv-bank-api",
      persistence: deps.env.PERSISTENCE_DRIVER,
      database: deps.env.PERSISTENCE_DRIVER === "prisma" ? "unavailable" : "not_required",
      timestamp: new Date().toISOString(),
    });
  }

  if (deps.env.PERSISTENCE_DRIVER === "memory") {
    return readinessResponseSchema.parse({
      status: "ready",
      service: "luv-bank-api",
      persistence: "memory",
      database: "not_required",
      timestamp: new Date().toISOString(),
    });
  }

  if (!deps.prisma) {
    return readinessResponseSchema.parse({
      status: "not_ready",
      service: "luv-bank-api",
      persistence: "prisma",
      database: "unavailable",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    await deps.prisma.$queryRaw`SELECT 1`;
    return readinessResponseSchema.parse({
      status: "ready",
      service: "luv-bank-api",
      persistence: "prisma",
      database: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return readinessResponseSchema.parse({
      status: "not_ready",
      service: "luv-bank-api",
      persistence: "prisma",
      database: "unavailable",
      timestamp: new Date().toISOString(),
    });
  }
}

export function createHealthHandlers(deps: HealthDeps) {
  const liveHandler: RequestHandler = (_req, res) => {
    res.status(200).json(getLiveness());
  };

  /** Back-compat alias for liveness. */
  const healthHandler: RequestHandler = liveHandler;

  const readyHandler: RequestHandler = async (_req, res) => {
    const body = await getReadiness(deps);
    res.status(body.status === "ready" ? 200 : 503).json(body);
  };

  return { healthHandler, liveHandler, readyHandler };
}
