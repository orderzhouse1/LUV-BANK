import request from "supertest";
import { describe, expect, it } from "vitest";
import { healthResponseSchema, readinessResponseSchema } from "@luv-bank/validation";
import { createApp } from "../../app";
import { createTestEnv } from "../../test/test-env";
import { createMemoryAuthRepository } from "../auth/memory-auth.repository";

describe("GET /api/v1/health", () => {
  it("returns a validated health payload without requiring a database", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
    });

    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.headers["x-request-id"]).toBeTruthy();

    const body = healthResponseSchema.parse(response.body);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("luv-bank-api");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it("exposes liveness and readiness endpoints", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
    });

    const live = await request(app).get("/api/v1/health/live");
    expect(live.status).toBe(200);
    expect(healthResponseSchema.parse(live.body).status).toBe("ok");

    const ready = await request(app).get("/api/v1/health/ready");
    expect(ready.status).toBe(200);
    const body = readinessResponseSchema.parse(ready.body);
    expect(body.status).toBe("ready");
    expect(body.persistence).toBe("memory");
    expect(body.database).toBe("not_required");
  });

  it("returns a safe not-found error for unknown routes", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
    });

    const response = await request(app).get("/api/v1/unknown");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(response.body.error.requestId).toBeTruthy();
  });
});
