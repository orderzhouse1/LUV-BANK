import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient, type PrismaClient } from "@luv-bank/database";
import { createApp } from "../../app";
import { ACCESS_COOKIE, CSRF_COOKIE } from "../../lib/crypto";
import { createPrismaAuthRepository } from "../auth/prisma-auth.repository";
import { createPrismaMomentRepository } from "../moments/prisma-moment.repository";
import { createPrismaNudgeSuppressionRepository } from "../nudges/prisma-nudge-suppression.repository";
import { createPrismaReminderPreferenceRepository } from "../reminders/prisma-reminder.repository";
import { createPrismaShareSnapshotRepository } from "../shares/prisma-share.repository";
import { createPersistence } from "../../persistence/create-persistence";
import { createTestEnv } from "../../test/test-env";

const neonEnabled = process.env.RUN_NEON_TESTS === "1";

function getCookie(res: request.Response, name: string): string | undefined {
  const raw = res.headers["set-cookie"];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.find((item) => item.startsWith(`${name}=`));
}

function readCookieValue(setCookie: string | undefined): string {
  if (!setCookie) return "";
  return decodeURIComponent(setCookie.split(";")[0]!.split("=").slice(1).join("="));
}

describe.runIf(neonEnabled)("Phase 10 Neon persistence", () => {
  let prisma: PrismaClient;
  let app: ReturnType<typeof createApp>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
      throw new Error("DATABASE_URL and DIRECT_URL are required for Neon tests.");
    }
    prisma = createPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    const env = createTestEnv({
      PERSISTENCE_DRIVER: "prisma",
      DATABASE_URL: process.env.DATABASE_URL,
      DIRECT_URL: process.env.DIRECT_URL,
      AUTH_RATE_LIMIT_MAX: 10_000,
    });
    app = createApp({
      env,
      authRepository: createPrismaAuthRepository(prisma),
      momentRepository: createPrismaMomentRepository(prisma),
      nudgeSuppressionRepository: createPrismaNudgeSuppressionRepository(prisma),
      reminderPreferenceRepository: createPrismaReminderPreferenceRepository(prisma),
      shareSnapshotRepository: createPrismaShareSnapshotRepository(prisma),
    });
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
  });

  async function getCsrf() {
    const res = await request(app).get("/api/v1/auth/csrf");
    return {
      token: res.body.csrfToken as string,
      cookie: getCookie(res, CSRF_COOKIE) ?? "",
    };
  }

  async function register(email: string, password = "passphrase-twelve") {
    const csrf = await getCsrf();
    const registered = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({
        email,
        password,
        displayName: "Neon Owner",
        acceptedTerms: true,
      });
    expect(registered.status).toBe(201);
    const access = readCookieValue(getCookie(registered, ACCESS_COOKIE));
    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    createdUserIds.push(me.body.user.id);
    return { access, password, userId: me.body.user.id as string };
  }

  it("persists register → profile → moment → balance against PostgreSQL", async () => {
    const email = `neon-flow-${randomUUID()}@example.com`;
    const { access } = await register(email);

    let csrf = await getCsrf();
    const profile = await request(app)
      .post("/api/v1/relationship-profiles")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({ title: "Neon bond" });
    expect(profile.status).toBe(201);

    csrf = await getCsrf();
    const moment = await request(app)
      .post("/api/v1/moments")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        kind: "POSITIVE",
        categoryCode: "AFFECTION",
        note: "neon-private-note",
        occurredAt: new Date().toISOString(),
        clientMutationId: randomUUID(),
      });
    expect(moment.status).toBe(201);
    expect(moment.headers["cache-control"]).toBe("no-store");

    const balance = await request(app)
      .get("/api/v1/balance/summary?window=30d")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(balance.status).toBe(200);
    expect(balance.body.currentPeriod.positiveContribution).toBeGreaterThanOrEqual(1);
    expect(balance.body.lifetime.totalMoments).toBeGreaterThanOrEqual(1);

    const dbMoments = await prisma.moment.count({
      where: { note: "neon-private-note" },
    });
    expect(dbMoments).toBe(1);
  });

  it("enforces unique email concurrently", async () => {
    const email = `neon-race-email-${randomUUID()}@example.com`;
    const csrfA = await getCsrf();
    const csrfB = await getCsrf();
    const [a, b] = await Promise.all([
      request(app)
        .post("/api/v1/auth/register")
        .set("Origin", "http://localhost:3000")
        .set("Cookie", csrfA.cookie)
        .set("X-CSRF-Token", csrfA.token)
        .send({
          email,
          password: "passphrase-twelve",
          displayName: "A",
          acceptedTerms: true,
        }),
      request(app)
        .post("/api/v1/auth/register")
        .set("Origin", "http://localhost:3000")
        .set("Cookie", csrfB.cookie)
        .set("X-CSRF-Token", csrfB.token)
        .send({
          email,
          password: "passphrase-twelve",
          displayName: "B",
          acceptedTerms: true,
        }),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);
    const winner = a.status === 201 ? a : b;
    const me = await request(app)
      .get("/api/v1/auth/me")
      .set(
        "Cookie",
        `${ACCESS_COOKIE}=${encodeURIComponent(readCookieValue(getCookie(winner, ACCESS_COOKIE)))}`,
      );
    createdUserIds.push(me.body.user.id);
  });

  it("enforces unique clientMutationId under concurrent creates", async () => {
    const { access } = await register(`neon-mutation-${randomUUID()}@example.com`);
    let csrf = await getCsrf();
    await request(app)
      .post("/api/v1/relationship-profiles")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({ title: "Race profile" });

    const mutationId = randomUUID();
    const body = {
      kind: "POSITIVE",
      categoryCode: "AFFECTION",
      occurredAt: new Date().toISOString(),
      clientMutationId: mutationId,
    };
    csrf = await getCsrf();
    const csrf2 = await getCsrf();
    const [first, second] = await Promise.all([
      request(app)
        .post("/api/v1/moments")
        .set("Origin", "http://localhost:3000")
        .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
        .set("X-CSRF-Token", csrf.token)
        .send(body),
      request(app)
        .post("/api/v1/moments")
        .set("Origin", "http://localhost:3000")
        .set("Cookie", `${csrf2.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
        .set("X-CSRF-Token", csrf2.token)
        .send(body),
    ]);
    const okCount = [first.status, second.status].filter((s) => s === 201).length;
    expect(okCount).toBeGreaterThanOrEqual(1);
    // Second may be 201 idempotent replay or 409 conflict depending on fingerprint timing.
    expect([first.status, second.status].every((s) => s === 201 || s === 409 || s === 200)).toBe(
      true,
    );
    const count = await prisma.moment.count({ where: { clientMutationId: mutationId } });
    expect(count).toBe(1);
  });

  it("survives prisma disconnect/reconnect (durability)", async () => {
    const email = `neon-durable-${randomUUID()}@example.com`;
    const { access, userId } = await register(email);
    const csrf = await getCsrf();
    await request(app)
      .post("/api/v1/relationship-profiles")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({ title: "Durable bond" });

    await prisma.$disconnect();
    const prisma2 = createPrismaClient();
    const user = await prisma2.user.findUnique({ where: { id: userId } });
    expect(user?.email).toBe(email.toLowerCase());
    const profiles = await prisma2.relationshipProfile.count({ where: { ownerId: userId } });
    expect(profiles).toBe(1);
    await prisma2.$disconnect();
    prisma = createPrismaClient();
  });

  it("hard-deletes account data in PostgreSQL", async () => {
    const email = `neon-delete-${randomUUID()}@example.com`;
    const { access, password, userId } = await register(email);
    let csrf = await getCsrf();
    await request(app)
      .post("/api/v1/relationship-profiles")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({ title: "Delete me" });

    csrf = await getCsrf();
    await request(app)
      .post("/api/v1/moments")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        kind: "POSITIVE",
        categoryCode: "AFFECTION",
        note: "to-be-removed",
        occurredAt: new Date().toISOString(),
        clientMutationId: randomUUID(),
      });

    csrf = await getCsrf();
    const deleted = await request(app)
      .post("/api/v1/account/delete")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({ currentPassword: password, confirmationPhrase: "DELETE_MY_ACCOUNT" });
    expect(deleted.status).toBe(204);

    expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();
    expect(await prisma.moment.count({ where: { note: "to-be-removed" } })).toBe(0);
    // Allow re-register of same email after hard delete.
    const again = await register(email);
    expect(again.userId).not.toBe(userId);
  });

  it("refuses silent memory fallback when prisma is selected", async () => {
    await expect(
      createPersistence(
        createTestEnv({
          PERSISTENCE_DRIVER: "prisma",
          DATABASE_URL: "postgresql://invalid:invalid@127.0.0.1:1/nope",
          DIRECT_URL: "postgresql://invalid:invalid@127.0.0.1:1/nope",
        }),
      ),
    ).rejects.toThrow(/Refusing to fall back to memory/i);
  }, 30_000);
});
