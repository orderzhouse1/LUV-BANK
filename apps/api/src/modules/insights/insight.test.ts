import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  DESCRIPTIVE_INSIGHTS_V1,
  INSIGHT_BUCKET_LAYOUT,
  MVP_EQUAL_WEIGHT_V1,
} from "@luv-bank/validation";
import { apiEnvSchema } from "@luv-bank/config";
import { createApp } from "../../app";
import { ACCESS_COOKIE, CSRF_COOKIE } from "../../lib/crypto";
import { createMemoryAuthRepository } from "../auth/memory-auth.repository";
import { createMemoryMomentRepository } from "../moments/memory-moment.repository";
import { createTestEnv } from "../../test/test-env";
import {
  buildTrendBuckets,
  evaluateDescriptiveInsightsV1,
  momentInInterval,
} from "./descriptive-insights-v1";

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

describe("DESCRIPTIVE_INSIGHTS_V1 rules", () => {
  it("covers each window with non-overlapping buckets of exact duration", () => {
    for (const window of ["7d", "30d", "90d"] as const) {
      const layout = INSIGHT_BUCKET_LAYOUT[window];
      expect(layout.bucketCount * layout.bucketDays).toBe(layout.days);
    }
    const generatedAt = new Date("2026-08-02T12:00:00.000Z");
    const buckets = buildTrendBuckets([], "7d", generatedAt);
    expect(buckets).toHaveLength(7);
    for (let i = 0; i < buckets.length; i++) {
      const start = new Date(buckets[i]!.startsAt).getTime();
      const end = new Date(buckets[i]!.endsAt).getTime();
      expect(end - start).toBe(24 * 60 * 60 * 1000);
      if (i > 0) {
        expect(start).toBe(new Date(buckets[i - 1]!.endsAt).getTime());
      }
    }
  });

  it("assigns boundary moments to exactly one bucket", () => {
    const generatedAt = new Date("2026-08-02T12:00:00.000Z");
    const periodStart = new Date(generatedAt.getTime() - 7 * 24 * 60 * 60 * 1000);
    const boundary = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
    const moments = [
      {
        kind: "POSITIVE" as const,
        categoryCode: "AFFECTION" as const,
        scoreImpact: 1,
        scoringVersion: MVP_EQUAL_WEIGHT_V1,
        occurredAt: boundary,
      },
    ];
    const buckets = buildTrendBuckets(moments, "7d", generatedAt);
    const hits = buckets.filter((b) => b.totalMoments > 0);
    expect(hits).toHaveLength(1);
  });

  it("uses half-open intervals with inclusive final end", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const end = new Date("2026-01-02T00:00:00.000Z");
    expect(momentInInterval(start, start, end, { inclusiveEnd: false })).toBe(true);
    expect(momentInInterval(end, start, end, { inclusiveEnd: false })).toBe(false);
    expect(momentInInterval(end, start, end, { inclusiveEnd: true })).toBe(true);
  });

  it("emits descriptive observation codes without clinical labels", () => {
    const observations = evaluateDescriptiveInsightsV1({
      current: {
        startsAt: new Date(),
        endsAt: new Date(),
        positiveContribution: 5,
        difficultContribution: 2,
        netBalance: 3,
        totalMoments: 7,
      },
      previous: {
        startsAt: new Date(),
        endsAt: new Date(),
        positiveContribution: 1,
        difficultContribution: 0,
        netBalance: 1,
        totalMoments: 1,
      },
      currentMoments: [
        {
          kind: "POSITIVE",
          categoryCode: "SUPPORT",
          scoreImpact: 1,
          scoringVersion: MVP_EQUAL_WEIGHT_V1,
          occurredAt: new Date(),
        },
        {
          kind: "POSITIVE",
          categoryCode: "SUPPORT",
          scoreImpact: 1,
          scoringVersion: MVP_EQUAL_WEIGHT_V1,
          occurredAt: new Date(),
        },
        {
          kind: "DIFFICULT",
          categoryCode: "TENSION",
          scoreImpact: -1,
          scoringVersion: MVP_EQUAL_WEIGHT_V1,
          occurredAt: new Date(),
        },
      ],
    });
    const codes = observations.map((o) => o.code);
    expect(codes).toContain("ENOUGH_RECORDED_DATA");
    expect(codes).toContain("POSITIVE_CONTRIBUTION_GREATER");
    expect(codes).toContain("NET_BALANCE_INCREASED");
    expect(codes).toContain("MOST_RECORDED_POSITIVE_CATEGORY");
    expect(JSON.stringify(observations)).not.toMatch(/Thriving|Struggling|Gottman|toxic|healthy/i);
  });
});

describe("insights API (in-memory)", () => {
  it("requires authentication and an active profile", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
    });
    const unauth = await request(app).get("/api/v1/insights/summary");
    expect(unauth.status).toBe(401);

    const csrf = await getCsrf(app);
    const registered = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({
        email: "insights-noprofile@example.com",
        password: "passphrase-twelve",
        displayName: "No Profile",
        acceptedTerms: true,
      });
    const access = readCookieValue(getCookie(registered, ACCESS_COOKIE));
    const noProfile = await request(app)
      .get("/api/v1/insights/summary")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(noProfile.status).toBe(400);
    expect(noProfile.body.error.code).toBe("PROFILE_REQUIRED");
  });

  it("returns descriptive summary with buckets and no notes", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
    });
    const { access } = await registerAndOnboard(app, "insights@example.com");
    const now = Date.now();

    for (let i = 0; i < 4; i++) {
      await createMoment(app, access, {
        kind: "POSITIVE",
        categoryCode: "AFFECTION",
        note: "private note must not appear",
        clientMutationId: randomUUID(),
        occurredAt: new Date(now - i * 60_000).toISOString(),
      });
    }
    await createMoment(app, access, {
      kind: "DIFFICULT",
      categoryCode: "ARGUMENT",
      note: "secret",
      clientMutationId: randomUUID(),
      occurredAt: new Date(now - 90_000).toISOString(),
    });
    await createMoment(app, access, {
      kind: "POSITIVE",
      categoryCode: "SUPPORT",
      clientMutationId: randomUUID(),
      occurredAt: new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const summary = await request(app)
      .get("/api/v1/insights/summary?window=30d")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(summary.status).toBe(200);
    expect(summary.headers["cache-control"]).toMatch(/no-store/i);
    expect(summary.body.insightRuleset).toBe(DESCRIPTIVE_INSIGHTS_V1);
    expect(summary.body.scoringVersion).toBe(MVP_EQUAL_WEIGHT_V1);
    expect(summary.body.buckets).toHaveLength(10);
    expect(summary.body.currentPeriod.totalMoments).toBe(5);
    expect(summary.body.previousPeriod.totalMoments).toBe(1);
    expect(
      summary.body.observations.some((o: { code: string }) => o.code === "ENOUGH_RECORDED_DATA"),
    ).toBe(true);
    expect(JSON.stringify(summary.body)).not.toMatch(
      /private note|secret|password|Thriving|Gottman/i,
    );
    expect(summary.body).not.toHaveProperty("all");
  });

  it("rejects unknown insight rulesets at env validation", () => {
    expect(() =>
      apiEnvSchema.parse({
        NODE_ENV: "development",
        API_PUBLIC_URL: "http://localhost:4000",
        CORS_ORIGINS: "http://localhost:3000",
        PERSISTENCE_DRIVER: "memory",
        JWT_ACCESS_SECRET: "dev-access-secret-value-32chars!!!",
        JWT_REFRESH_SECRET: "dev-refresh-secret-value-32chars!!",
        CSRF_SECRET: "dev-csrf-secret-value-32chars!!!!!!",
        ACTIVE_INSIGHT_RULESET: "UNKNOWN_RULESET",
      }),
    ).toThrow();
  });
});
