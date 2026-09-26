import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app";
import { ACCESS_COOKIE, CSRF_COOKIE } from "../../lib/crypto";
import { createMemoryAuthRepository } from "../auth/memory-auth.repository";
import { createMemoryMomentRepository } from "./memory-moment.repository";
import { createTestEnv } from "../../test/test-env";
import { apiEnvSchema } from "@luv-bank/config";

function getCookie(res: request.Response, name: string): string | undefined {
  const raw = res.headers["set-cookie"];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.find((item) => item.startsWith(`${name}=`));
}

function readCookieValue(setCookie: string | undefined): string {
  if (!setCookie) return "";
  return decodeURIComponent(setCookie.split(";")[0]!.split("=").slice(1).join("="));
}

async function getCsrf(app: ReturnType<typeof createApp>) {
  const res = await request(app).get("/api/v1/auth/csrf");
  return {
    token: res.body.csrfToken as string,
    cookie: getCookie(res, CSRF_COOKIE) ?? "",
  };
}

async function registerAndOnboard(app: ReturnType<typeof createApp>, email: string) {
  let csrf = await getCsrf(app);
  const registered = await request(app)
    .post("/api/v1/auth/register")
    .set("Origin", "http://localhost:3000")
    .set("Cookie", csrf.cookie)
    .set("X-CSRF-Token", csrf.token)
    .send({
      email,
      password: "passphrase-twelve",
      displayName: "Owner",
      acceptedTerms: true,
    });
  const access = readCookieValue(getCookie(registered, ACCESS_COOKIE));
  csrf = await getCsrf(app);
  await request(app)
    .post("/api/v1/relationship-profiles")
    .set("Origin", "http://localhost:3000")
    .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
    .set("X-CSRF-Token", csrf.token)
    .send({ title: "Private bond" });
  return { access };
}

describe("moments API (in-memory)", () => {
  it("rejects unauthenticated and CSRF-missing creates", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
    });
    const unauth = await request(app).post("/api/v1/moments").send({
      kind: "POSITIVE",
      categoryCode: "AFFECTION",
      clientMutationId: randomUUID(),
    });
    expect(unauth.status).toBe(401);
    expect(unauth.body.error.code).toBe("UNAUTHENTICATED");

    const { access } = await registerAndOnboard(app, "csrf@example.com");
    const missingCsrf = await request(app)
      .post("/api/v1/moments")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .send({
        kind: "POSITIVE",
        categoryCode: "AFFECTION",
        clientMutationId: randomUUID(),
      });
    expect(missingCsrf.status).toBe(403);
    expect(missingCsrf.body.error.code).toBe("CSRF_INVALID");
  });

  it("requires an active profile and validates category/kind pairing", async () => {
    const authRepo = createMemoryAuthRepository();
    const app = createApp({
      env: createTestEnv(),
      authRepository: authRepo,
      momentRepository: createMemoryMomentRepository(),
    });

    let csrf = await getCsrf(app);
    const registered = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({
        email: "noprofile@example.com",
        password: "passphrase-twelve",
        displayName: "No Profile",
        acceptedTerms: true,
      });
    const access = readCookieValue(getCookie(registered, ACCESS_COOKIE));
    csrf = await getCsrf(app);
    const noProfile = await request(app)
      .post("/api/v1/moments")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        kind: "POSITIVE",
        categoryCode: "AFFECTION",
        clientMutationId: randomUUID(),
      });
    expect(noProfile.status).toBe(400);
    expect(noProfile.body.error.code).toBe("PROFILE_REQUIRED");

    const { access: ready } = await registerAndOnboard(app, "ready@example.com");
    csrf = await getCsrf(app);
    const mismatch = await request(app)
      .post("/api/v1/moments")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(ready)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        kind: "POSITIVE",
        categoryCode: "TENSION",
        clientMutationId: randomUUID(),
      });
    expect(mismatch.status).toBe(400);
  });

  it("creates, lists, paginates, filters, updates, and deletes owned moments with idempotency", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
    });
    const userA = await registerAndOnboard(app, "ledger-a@example.com");
    const userB = await registerAndOnboard(app, "ledger-b@example.com");

    const mutationId = randomUUID();
    let csrf = await getCsrf(app);
    const created = await request(app)
      .post("/api/v1/moments")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(userA.access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        kind: "POSITIVE",
        categoryCode: "AFFECTION",
        note: "A calm shared walk",
        clientMutationId: mutationId,
        occurredAt: new Date("2026-01-01T10:00:00.000Z").toISOString(),
      });
    expect(created.status).toBe(201);
    expect(created.headers["cache-control"]).toMatch(/no-store/i);
    expect(created.body.moment.note).toBe("A calm shared walk");
    expect(created.body.moment.scoreImpact).toBe(1);
    expect(created.body.moment.scoringVersion).toBe("MVP_EQUAL_WEIGHT_V1");
    expect(JSON.stringify(created.body)).not.toMatch(/passwordHash|Sara|\+128/i);
    const momentId = created.body.moment.id as string;

    csrf = await getCsrf(app);
    const replay = await request(app)
      .post("/api/v1/moments")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(userA.access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        kind: "POSITIVE",
        categoryCode: "AFFECTION",
        note: "A calm shared walk",
        clientMutationId: mutationId,
        occurredAt: new Date("2026-01-01T10:00:00.000Z").toISOString(),
      });
    expect(replay.status).toBe(200);
    expect(replay.body.moment.id).toBe(momentId);
    expect(replay.body.moment.scoreImpact).toBe(1);
    expect(replay.body.moment.scoringVersion).toBe("MVP_EQUAL_WEIGHT_V1");

    csrf = await getCsrf(app);
    const conflict = await request(app)
      .post("/api/v1/moments")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(userA.access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        kind: "DIFFICULT",
        categoryCode: "TENSION",
        note: "Different",
        clientMutationId: mutationId,
      });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_CONFLICT");

    csrf = await getCsrf(app);
    await request(app)
      .post("/api/v1/moments")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(userA.access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        kind: "DIFFICULT",
        categoryCode: "ARGUMENT",
        note: "",
        clientMutationId: randomUUID(),
        occurredAt: new Date("2026-01-02T10:00:00.000Z").toISOString(),
      });

    const list = await request(app)
      .get("/api/v1/moments?limit=1")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(userA.access)}`);
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.nextCursor).toBeTruthy();
    const page2 = await request(app)
      .get(`/api/v1/moments?limit=1&cursor=${encodeURIComponent(list.body.nextCursor)}`)
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(userA.access)}`);
    expect(page2.body.items).toHaveLength(1);
    expect(page2.body.items[0].id).not.toBe(list.body.items[0].id);

    const positives = await request(app)
      .get("/api/v1/moments?kind=POSITIVE")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(userA.access)}`);
    expect(positives.body.items.every((m: { kind: string }) => m.kind === "POSITIVE")).toBe(true);

    csrf = await getCsrf(app);
    const updated = await request(app)
      .patch(`/api/v1/moments/${momentId}`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(userA.access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({ note: "Updated private note" });
    expect(updated.status).toBe(200);
    expect(updated.body.moment.note).toBe("Updated private note");

    csrf = await getCsrf(app);
    const badUpdate = await request(app)
      .patch(`/api/v1/moments/${momentId}`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(userA.access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({ kind: "DIFFICULT" });
    expect(badUpdate.status).toBe(400);

    const foreign = await request(app)
      .get(`/api/v1/moments/${momentId}`)
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(userB.access)}`);
    expect(foreign.status).toBe(404);
    expect(foreign.body.error.code).toBe("MOMENT_NOT_FOUND");

    csrf = await getCsrf(app);
    const foreignDelete = await request(app)
      .delete(`/api/v1/moments/${momentId}`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(userB.access)}`)
      .set("X-CSRF-Token", csrf.token);
    expect(foreignDelete.status).toBe(404);

    csrf = await getCsrf(app);
    const deleted = await request(app)
      .delete(`/api/v1/moments/${momentId}`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(userA.access)}`)
      .set("X-CSRF-Token", csrf.token);
    expect(deleted.status).toBe(204);

    const after = await request(app)
      .get(`/api/v1/moments/${momentId}`)
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(userA.access)}`);
    expect(after.status).toBe(404);
  });

  it("rejects unsafe notes, future dates, and long notes", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
    });
    const { access } = await registerAndOnboard(app, "validate@example.com");
    let csrf = await getCsrf(app);

    const longNote = "x".repeat(501);
    const tooLong = await request(app)
      .post("/api/v1/moments")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        kind: "POSITIVE",
        categoryCode: "SUPPORT",
        note: longNote,
        clientMutationId: randomUUID(),
      });
    expect(tooLong.status).toBe(400);

    csrf = await getCsrf(app);
    const control = await request(app)
      .post("/api/v1/moments")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        kind: "POSITIVE",
        categoryCode: "SUPPORT",
        note: "bad\u0000note",
        clientMutationId: randomUUID(),
      });
    expect(control.status).toBe(400);

    csrf = await getCsrf(app);
    const future = await request(app)
      .post("/api/v1/moments")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        kind: "POSITIVE",
        categoryCode: "SUPPORT",
        occurredAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        clientMutationId: randomUUID(),
      });
    expect(future.status).toBe(400);
    expect(future.body.error.code).toBe("INVALID_OCCURRED_AT");
  });

  it("rejects memory persistence in production env validation", () => {
    expect(() =>
      apiEnvSchema.parse({
        NODE_ENV: "production",
        API_PUBLIC_URL: "https://api.example.com",
        CORS_ORIGINS: "https://example.com",
        PERSISTENCE_DRIVER: "memory",
        JWT_ACCESS_SECRET: "prod-access-secret-value-32chars!",
        JWT_REFRESH_SECRET: "prod-refresh-secret-value-32chars",
        CSRF_SECRET: "prod-csrf-secret-value-32chars!!!!",
      }),
    ).toThrow();
  });

  it("handles concurrent duplicate creates with one moment", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
    });
    const { access } = await registerAndOnboard(app, "concurrent@example.com");
    const mutationId = randomUUID();
    const csrf = await getCsrf(app);
    const payload = {
      kind: "POSITIVE" as const,
      categoryCode: "SHARED_JOY" as const,
      note: "Same submit",
      clientMutationId: mutationId,
      occurredAt: new Date("2026-03-01T12:00:00.000Z").toISOString(),
    };
    const [a, b] = await Promise.all([
      request(app)
        .post("/api/v1/moments")
        .set("Origin", "http://localhost:3000")
        .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
        .set("X-CSRF-Token", csrf.token)
        .send(payload),
      request(app)
        .post("/api/v1/moments")
        .set("Origin", "http://localhost:3000")
        .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
        .set("X-CSRF-Token", csrf.token)
        .send(payload),
    ]);
    expect([a.status, b.status].every((status) => status === 200 || status === 201)).toBe(true);
    expect(a.body.moment.id).toBe(b.body.moment.id);
    const list = await request(app)
      .get("/api/v1/moments")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(list.body.items).toHaveLength(1);
  });
});
