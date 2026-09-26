import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { MVP_EQUAL_WEIGHT_V1 } from "@luv-bank/validation";
import { createApp } from "../../app";
import { ACCESS_COOKIE, CSRF_COOKIE } from "../../lib/crypto";
import { createMemoryAuthRepository } from "../auth/memory-auth.repository";
import { createMemoryMomentRepository } from "../moments/memory-moment.repository";
import { createTestEnv } from "../../test/test-env";

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

async function createMoment(
  app: ReturnType<typeof createApp>,
  access: string,
  body: Record<string, unknown>,
) {
  const csrf = await getCsrf(app);
  return request(app)
    .post("/api/v1/moments")
    .set("Origin", "http://localhost:3000")
    .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
    .set("X-CSRF-Token", csrf.token)
    .send(body);
}

describe("balance summary API (in-memory)", () => {
  it("requires auth and an active profile", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
    });
    const unauth = await request(app).get("/api/v1/balance/summary");
    expect(unauth.status).toBe(401);

    const csrf = await getCsrf(app);
    const registered = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({
        email: "balance-noprofile@example.com",
        password: "passphrase-twelve",
        displayName: "No Profile",
        acceptedTerms: true,
      });
    const access = readCookieValue(getCookie(registered, ACCESS_COOKIE));
    const noProfile = await request(app)
      .get("/api/v1/balance/summary")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(noProfile.status).toBe(400);
    expect(noProfile.body.error.code).toBe("PROFILE_REQUIRED");
  });

  it("aggregates lifetime and rolling windows with previous comparison", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
    });
    const { access } = await registerAndOnboard(app, "balance@example.com");
    const now = Date.now();

    for (let i = 0; i < 5; i++) {
      await createMoment(app, access, {
        kind: "POSITIVE",
        categoryCode: "AFFECTION",
        clientMutationId: randomUUID(),
        occurredAt: new Date(now - i * 60_000).toISOString(),
      });
    }
    for (let i = 0; i < 2; i++) {
      await createMoment(app, access, {
        kind: "DIFFICULT",
        categoryCode: "TENSION",
        clientMutationId: randomUUID(),
        occurredAt: new Date(now - (i + 1) * 120_000).toISOString(),
      });
    }
    // Moment in previous 30d window only
    await createMoment(app, access, {
      kind: "POSITIVE",
      categoryCode: "SUPPORT",
      clientMutationId: randomUUID(),
      occurredAt: new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const summary = await request(app)
      .get("/api/v1/balance/summary?window=30d")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(summary.status).toBe(200);
    expect(summary.headers["cache-control"]).toMatch(/no-store/i);
    expect(summary.body.scoringVersion).toBe(MVP_EQUAL_WEIGHT_V1);
    expect(summary.body.selectedWindow).toBe("30d");
    expect(summary.body.lifetime).toEqual({
      positiveContribution: 6,
      difficultContribution: 2,
      netBalance: 4,
      totalMoments: 8,
    });
    expect(summary.body.currentPeriod.positiveContribution).toBe(5);
    expect(summary.body.currentPeriod.difficultContribution).toBe(2);
    expect(summary.body.currentPeriod.netBalance).toBe(3);
    expect(summary.body.currentPeriod.totalMoments).toBe(7);
    expect(summary.body.previousPeriod.totalMoments).toBe(1);
    expect(summary.body.previousPeriod.netBalance).toBe(1);
    expect(summary.body.changeFromPrevious.netBalance).toBe(2);
    expect(JSON.stringify(summary.body)).not.toMatch(/note|password|Sara|\+128/i);

    const lifetime = await request(app)
      .get("/api/v1/balance/summary?window=all")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(lifetime.body.previousPeriod).toBeNull();
    expect(lifetime.body.changeFromPrevious).toBeNull();
    expect(lifetime.body.currentPeriod.netBalance).toBe(4);
  });

  it("updates balance after delete and preserves score on note-only edit", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
    });
    const { access } = await registerAndOnboard(app, "balance-edit@example.com");
    const created = await createMoment(app, access, {
      kind: "POSITIVE",
      categoryCode: "SHARED_JOY",
      note: "first",
      clientMutationId: randomUUID(),
    });
    expect(created.body.moment.scoreImpact).toBe(1);
    expect(created.body.moment.scoringVersion).toBe(MVP_EQUAL_WEIGHT_V1);
    const momentId = created.body.moment.id as string;

    let csrf = await getCsrf(app);
    const noteOnly = await request(app)
      .patch(`/api/v1/moments/${momentId}`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({ note: "updated note only" });
    expect(noteOnly.body.moment.scoreImpact).toBe(1);
    expect(noteOnly.body.moment.scoringVersion).toBe(MVP_EQUAL_WEIGHT_V1);

    csrf = await getCsrf(app);
    const kindChange = await request(app)
      .patch(`/api/v1/moments/${momentId}`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({ kind: "DIFFICULT", categoryCode: "ARGUMENT" });
    expect(kindChange.body.moment.scoreImpact).toBe(-1);
    expect(kindChange.body.moment.scoringVersion).toBe(MVP_EQUAL_WEIGHT_V1);

    let summary = await request(app)
      .get("/api/v1/balance/summary?window=all")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(summary.body.lifetime.netBalance).toBe(-1);

    csrf = await getCsrf(app);
    await request(app)
      .delete(`/api/v1/moments/${momentId}`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token);
    summary = await request(app)
      .get("/api/v1/balance/summary?window=all")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(summary.body.lifetime.totalMoments).toBe(0);
    expect(summary.body.lifetime.netBalance).toBe(0);
  });
});
