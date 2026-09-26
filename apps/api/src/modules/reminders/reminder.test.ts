import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app";
import { ACCESS_COOKIE, CSRF_COOKIE } from "../../lib/crypto";
import { createMemoryAuthRepository } from "../auth/memory-auth.repository";
import { createMemoryMomentRepository } from "../moments/memory-moment.repository";
import { createMemoryReminderPreferenceRepository } from "./memory-reminder.repository";
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
  const profile = await request(app)
    .post("/api/v1/relationship-profiles")
    .set("Origin", "http://localhost:3000")
    .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
    .set("X-CSRF-Token", csrf.token)
    .send({ title: "Private bond" });
  return { access, relationshipId: profile.body.profile.id as string };
}

describe("reminders API", () => {
  it("returns disabled defaults without creating a preference", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
      reminderPreferenceRepository: createMemoryReminderPreferenceRepository(),
    });
    const { access } = await registerAndOnboard(app, `rem-def-${randomUUID()}@example.com`);

    const res = await request(app)
      .get("/api/v1/reminders/preference")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);

    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.body.enabled).toBe(false);
    expect(res.body.cadence).toBe("WEEKLY");
    expect(res.body.deliveryMode).toBe("IN_APP_CHECK");
    expect(res.body.nextDueAt).toBeNull();
    expect(res.body.current).toBeNull();
  });

  it("enables a weekly preference with CSRF and no-store", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
    });
    const { access } = await registerAndOnboard(app, `rem-en-${randomUUID()}@example.com`);
    const csrf = await getCsrf(app);

    const saved = await request(app)
      .put("/api/v1/reminders/preference")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        enabled: true,
        purposeCode: "PRIVATE_WEEKLY_CHECK_IN",
        weekday: "MONDAY",
        localHour: 9,
        localMinute: 0,
        timezone: "UTC",
      });

    expect(saved.status).toBe(200);
    expect(saved.body.enabled).toBe(true);
    expect(saved.body.nextDueAt).toBeTruthy();
    expect(saved.headers["cache-control"]).toBe("no-store");
    expect(JSON.stringify(saved.body)).not.toMatch(/Gottman|toxic|thriving|push notification/i);
  });

  it("requires CSRF for preference updates", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
    });
    const { access } = await registerAndOnboard(app, `rem-csrf-${randomUUID()}@example.com`);

    const res = await request(app)
      .put("/api/v1/reminders/preference")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .send({
        enabled: true,
        purposeCode: "RECORD_WHEN_READY",
        weekday: "TUESDAY",
        localHour: 10,
        localMinute: 30,
        timezone: "UTC",
      });

    expect(res.status).toBe(403);
  });

  it("dismisses and snoozes a due reminder without affecting balance", async () => {
    const reminders = createMemoryReminderPreferenceRepository();
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
      reminderPreferenceRepository: reminders,
    });
    const { access, relationshipId } = await registerAndOnboard(
      app,
      `rem-act-${randomUUID()}@example.com`,
    );

    await reminders.upsert({
      relationshipId,
      enabled: true,
      purposeCode: "REVIEW_RECENT_MOMENTS",
      weekday: "WEDNESDAY",
      localHour: 12,
      localMinute: 0,
      timezone: "UTC",
      nextDueAt: new Date("2020-01-01T12:00:00.000Z"),
      snoozedUntil: null,
    });

    const due = await request(app)
      .get("/api/v1/reminders/preference")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(due.body.current).not.toBeNull();
    expect(due.body.current.purposeCode).toBe("REVIEW_RECENT_MOMENTS");

    let csrf = await getCsrf(app);
    const snoozed = await request(app)
      .post("/api/v1/reminders/snooze")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({ duration: "1h" });
    expect(snoozed.status).toBe(200);
    expect(snoozed.body.current).toBeNull();
    expect(snoozed.body.snoozedUntil).toBeTruthy();

    await reminders.upsert({
      relationshipId,
      enabled: true,
      purposeCode: "REVIEW_RECENT_MOMENTS",
      weekday: "WEDNESDAY",
      localHour: 12,
      localMinute: 0,
      timezone: "UTC",
      nextDueAt: new Date("2020-01-01T12:00:00.000Z"),
      snoozedUntil: null,
    });

    csrf = await getCsrf(app);
    const dismissed = await request(app)
      .post("/api/v1/reminders/dismiss")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({});
    expect(dismissed.status).toBe(200);
    expect(dismissed.body.current).toBeNull();
    expect(new Date(dismissed.body.nextDueAt as string).getTime()).toBeGreaterThan(Date.now());

    const balance = await request(app)
      .get("/api/v1/balance/summary?window=30d")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(balance.status).toBe(200);
    expect(balance.body.lifetime.netBalance).toBe(0);
  });

  it("scopes preferences to the active profile owner", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
      reminderPreferenceRepository: createMemoryReminderPreferenceRepository(),
    });
    const a = await registerAndOnboard(app, `rem-a-${randomUUID()}@example.com`);
    const b = await registerAndOnboard(app, `rem-b-${randomUUID()}@example.com`);

    const csrf = await getCsrf(app);
    await request(app)
      .put("/api/v1/reminders/preference")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(a.access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        enabled: true,
        purposeCode: "RECORD_WHEN_READY",
        weekday: "FRIDAY",
        localHour: 8,
        localMinute: 15,
        timezone: "Europe/London",
      });

    const resB = await request(app)
      .get("/api/v1/reminders/preference")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(b.access)}`);
    expect(resB.body.enabled).toBe(false);
    expect(resB.body.purposeCode).toBe("PRIVATE_WEEKLY_CHECK_IN");
  });
});
