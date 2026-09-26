import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { GENTLE_NUDGES_V1 } from "@luv-bank/validation";
import { apiEnvSchema } from "@luv-bank/config";
import { createApp } from "../../app";
import { ACCESS_COOKIE, CSRF_COOKIE } from "../../lib/crypto";
import { createMemoryAuthRepository } from "../auth/memory-auth.repository";
import { createMemoryMomentRepository } from "../moments/memory-moment.repository";
import { createMemoryNudgeSuppressionRepository } from "./memory-nudge-suppression.repository";
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

describe("gentle nudges API", () => {
  it("returns START_WITH_ONE_PRIVATE_MOMENT with no-store when empty", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
      nudgeSuppressionRepository: createMemoryNudgeSuppressionRepository(),
    });
    const { access } = await registerAndOnboard(app, `nudge-empty-${randomUUID()}@example.com`);

    const res = await request(app)
      .get("/api/v1/nudges/current?window=30d")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);

    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body.nudgeRulesetVersion).toBe(GENTLE_NUDGES_V1);
    expect(res.body.selectedWindow).toBe("30d");
    expect(res.body.nudge.code).toBe("START_WITH_ONE_PRIVATE_MOMENT");
    expect(res.body.nudge.optional).toBe(true);
    expect(JSON.stringify(res.body)).not.toMatch(/thriving|struggling|toxic|gottman|5:1/i);
  });

  it("defaults window to 30d and scopes privately", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
    });
    const a = await registerAndOnboard(app, `nudge-a-${randomUUID()}@example.com`);
    const b = await registerAndOnboard(app, `nudge-b-${randomUUID()}@example.com`);

    await createMoment(app, a.access, {
      kind: "DIFFICULT",
      categoryCode: "ARGUMENT",
      note: "private-a",
      occurredAt: new Date().toISOString(),
      clientMutationId: randomUUID(),
    });
    // Enough moments to leave LIMITED_RECORDED_DATA and surface contribution rules.
    for (let i = 0; i < 4; i++) {
      await createMoment(app, a.access, {
        kind: "DIFFICULT",
        categoryCode: "ARGUMENT",
        occurredAt: new Date().toISOString(),
        clientMutationId: randomUUID(),
      });
    }

    const resA = await request(app)
      .get("/api/v1/nudges/current")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(a.access)}`);
    const resB = await request(app)
      .get("/api/v1/nudges/current")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(b.access)}`);

    expect(resA.status).toBe(200);
    expect(resA.body.selectedWindow).toBe("30d");
    expect(resA.body.nudge.code).toBe("MAKE_SPACE_BEFORE_YOUR_NEXT_STEP");
    expect(resB.body.nudge.code).toBe("START_WITH_ONE_PRIVATE_MOMENT");
    expect(JSON.stringify(resB.body)).not.toContain("private-a");
  });

  it("suppresses a nudge without affecting balance", async () => {
    const suppressions = createMemoryNudgeSuppressionRepository();
    const moments = createMemoryMomentRepository();
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: moments,
      nudgeSuppressionRepository: suppressions,
    });
    const { access } = await registerAndOnboard(app, `nudge-sup-${randomUUID()}@example.com`);

    const before = await request(app)
      .get("/api/v1/nudges/current?window=30d")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(before.body.nudge.code).toBe("START_WITH_ONE_PRIVATE_MOMENT");

    const csrf = await getCsrf(app);
    const suppressed = await request(app)
      .post("/api/v1/nudges/suppress")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({ nudgeCode: "START_WITH_ONE_PRIVATE_MOMENT", duration: "7d" });
    expect(suppressed.status).toBe(200);

    const after = await request(app)
      .get("/api/v1/nudges/current?window=30d")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(after.body.nudge).toBeNull();

    const balance = await request(app)
      .get("/api/v1/balance/summary?window=30d")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(balance.status).toBe(200);
    expect(balance.body.lifetime.netBalance).toBe(0);
    expect(balance.body.currentPeriod.netBalance).toBe(0);

    const insights = await request(app)
      .get("/api/v1/insights/summary?window=30d")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(insights.status).toBe(200);
  });

  it("requires CSRF for suppress", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
    });
    const { access } = await registerAndOnboard(app, `nudge-csrf-${randomUUID()}@example.com`);

    const res = await request(app)
      .post("/api/v1/nudges/suppress")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .send({ nudgeCode: "START_WITH_ONE_PRIVATE_MOMENT", duration: "1d" });

    expect(res.status).toBe(403);
  });

  it("rejects unknown ACTIVE_NUDGE_RULESET at env validation", () => {
    expect(() =>
      apiEnvSchema.parse({
        NODE_ENV: "development",
        API_PUBLIC_URL: "http://localhost:4000",
        CORS_ORIGINS: "http://localhost:3000",
        PERSISTENCE_DRIVER: "memory",
        JWT_ACCESS_SECRET: "dev-access-secret-value-32chars!!!",
        JWT_REFRESH_SECRET: "dev-refresh-secret-value-32chars!!",
        CSRF_SECRET: "dev-csrf-secret-value-32chars!!!!!!",
        ACTIVE_NUDGE_RULESET: "UNKNOWN_NUDGE",
      }),
    ).toThrow();
  });
});
