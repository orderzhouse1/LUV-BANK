import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { LUV_BANK_DATA_EXPORT_V1 } from "@luv-bank/validation";
import { createApp } from "../../app";
import { ACCESS_COOKIE, CSRF_COOKIE } from "../../lib/crypto";
import { createMemoryAuthRepository } from "../auth/memory-auth.repository";
import { createMemoryMomentRepository } from "../moments/memory-moment.repository";
import { createMemoryNudgeSuppressionRepository } from "../nudges/memory-nudge-suppression.repository";
import { createMemoryReminderPreferenceRepository } from "../reminders/memory-reminder.repository";
import { createMemoryShareSnapshotRepository } from "../shares/memory-share.repository";
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

async function registerAndOnboard(
  app: ReturnType<typeof createApp>,
  email: string,
  password = "passphrase-twelve",
) {
  let csrf = await getCsrf(app);
  const registered = await request(app)
    .post("/api/v1/auth/register")
    .set("Origin", "http://localhost:3000")
    .set("Cookie", csrf.cookie)
    .set("X-CSRF-Token", csrf.token)
    .send({
      email,
      password,
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
  return { access, password };
}

function authCookie(csrfCookie: string, access: string) {
  return `${csrfCookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`;
}

describe("account security API", () => {
  it("lists sessions and marks the current session", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
    });
    const { access } = await registerAndOnboard(app, `sessions-${randomUUID()}@example.com`);
    const listed = await request(app)
      .get("/api/v1/account/sessions")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);

    expect(listed.status).toBe(200);
    expect(listed.headers["cache-control"]).toBe("no-store");
    expect(listed.body.sessions.length).toBeGreaterThanOrEqual(1);
    expect(listed.body.sessions.some((s: { current: boolean }) => s.current)).toBe(true);
    expect(JSON.stringify(listed.body)).not.toMatch(/refreshToken|passwordHash|tokenHash/i);
  });

  it("revokes another session without signing out the current one", async () => {
    const authRepo = createMemoryAuthRepository();
    const app = createApp({ env: createTestEnv(), authRepository: authRepo });
    const email = `revoke-other-${randomUUID()}@example.com`;
    const password = "passphrase-twelve";

    let csrf = await getCsrf(app);
    const first = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({ email, password, displayName: "Owner", acceptedTerms: true });
    const accessA = readCookieValue(getCookie(first, ACCESS_COOKIE));

    csrf = await getCsrf(app);
    const second = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({ email, password });
    const accessB = readCookieValue(getCookie(second, ACCESS_COOKIE));

    const sessionsA = await request(app)
      .get("/api/v1/account/sessions")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(accessA)}`);
    const otherId = sessionsA.body.sessions.find(
      (s: { current: boolean; id: string }) => !s.current,
    )?.id as string;
    expect(otherId).toBeTruthy();

    csrf = await getCsrf(app);
    const revoked = await request(app)
      .post(`/api/v1/account/sessions/${otherId}/revoke`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", authCookie(csrf.cookie, accessA))
      .set("X-CSRF-Token", csrf.token);

    expect(revoked.status).toBe(200);

    const stillA = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(accessA)}`);
    expect(stillA.status).toBe(200);

    const deadB = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(accessB)}`);
    expect(deadB.status).toBe(401);
  });

  it("revoking the current session clears cookies and blocks protected access", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
    });
    const { access } = await registerAndOnboard(app, `revoke-self-${randomUUID()}@example.com`);
    const listed = await request(app)
      .get("/api/v1/account/sessions")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    const currentId = listed.body.sessions.find((s: { current: boolean }) => s.current)
      .id as string;

    const csrf = await getCsrf(app);
    const revoked = await request(app)
      .post(`/api/v1/account/sessions/${currentId}/revoke`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", authCookie(csrf.cookie, access))
      .set("X-CSRF-Token", csrf.token);

    expect(revoked.status).toBe(204);
    expect(getCookie(revoked, ACCESS_COOKIE)).toBeTruthy();

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(me.status).toBe(401);
  });

  it("rejects step-up operations with an invalid current password", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
    });
    const { access } = await registerAndOnboard(app, `bad-pw-${randomUUID()}@example.com`);
    const csrf = await getCsrf(app);
    const exported = await request(app)
      .post("/api/v1/account/export")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", authCookie(csrf.cookie, access))
      .set("X-CSRF-Token", csrf.token)
      .send({ currentPassword: "wrong-password-xx" });

    expect(exported.status).toBe(401);
    expect(exported.body.error.code).toBe("CURRENT_PASSWORD_INVALID");
  });

  it("exports personal data without secrets and includes private notes", async () => {
    const moments = createMemoryMomentRepository();
    const shares = createMemoryShareSnapshotRepository();
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: moments,
      nudgeSuppressionRepository: createMemoryNudgeSuppressionRepository(),
      reminderPreferenceRepository: createMemoryReminderPreferenceRepository(),
      shareSnapshotRepository: shares,
    });
    const { access, password } = await registerAndOnboard(
      app,
      `export-${randomUUID()}@example.com`,
    );

    let csrf = await getCsrf(app);
    await request(app)
      .post("/api/v1/moments")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", authCookie(csrf.cookie, access))
      .set("X-CSRF-Token", csrf.token)
      .send({
        kind: "POSITIVE",
        categoryCode: "AFFECTION",
        note: "private-export-note",
        occurredAt: new Date().toISOString(),
        clientMutationId: randomUUID(),
      });

    csrf = await getCsrf(app);
    await request(app)
      .post("/api/v1/share-snapshots")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", authCookie(csrf.cookie, access))
      .set("X-CSRF-Token", csrf.token)
      .send({ scope: "POSITIVE_ONLY", window: "30d", expiration: "7d" });

    csrf = await getCsrf(app);
    const exported = await request(app)
      .post("/api/v1/account/export")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", authCookie(csrf.cookie, access))
      .set("X-CSRF-Token", csrf.token)
      .send({ currentPassword: password });

    expect(exported.status).toBe(200);
    expect(exported.headers["cache-control"]).toBe("no-store");
    expect(exported.headers["content-disposition"]).toContain("luv-bank-data-export-v1.json");
    expect(exported.body.exportVersion).toBe(LUV_BANK_DATA_EXPORT_V1);
    expect(exported.body.moments[0].note).toBe("private-export-note");
    expect(exported.body.reminderOccurrences).toEqual([]);
    expect(exported.body.shareSnapshots.length).toBe(1);
    expect(JSON.stringify(exported.body)).not.toMatch(
      /passwordHash|refreshTokenHash|tokenHash|luv_access|luv_refresh|CSRF/i,
    );
  });

  it("changes password and requires the new password for export", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
    });
    const { access, password } = await registerAndOnboard(
      app,
      `pwchange-${randomUUID()}@example.com`,
    );
    const nextPassword = "brand-new-passphrase";

    let csrf = await getCsrf(app);
    const changed = await request(app)
      .post("/api/v1/account/password")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", authCookie(csrf.cookie, access))
      .set("X-CSRF-Token", csrf.token)
      .send({ currentPassword: password, newPassword: nextPassword });
    expect(changed.status).toBe(200);

    csrf = await getCsrf(app);
    const oldExport = await request(app)
      .post("/api/v1/account/export")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", authCookie(csrf.cookie, access))
      .set("X-CSRF-Token", csrf.token)
      .send({ currentPassword: password });
    expect(oldExport.body.error.code).toBe("CURRENT_PASSWORD_INVALID");

    csrf = await getCsrf(app);
    const newExport = await request(app)
      .post("/api/v1/account/export")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", authCookie(csrf.cookie, access))
      .set("X-CSRF-Token", csrf.token)
      .send({ currentPassword: nextPassword });
    expect(newExport.status).toBe(200);
  });

  it("permanently deletes the account, clears cookies, and breaks share resolve", async () => {
    const shares = createMemoryShareSnapshotRepository();
    const moments = createMemoryMomentRepository();
    const authRepo = createMemoryAuthRepository();
    const app = createApp({
      env: createTestEnv(),
      authRepository: authRepo,
      momentRepository: moments,
      shareSnapshotRepository: shares,
    });
    const email = `delete-${randomUUID()}@example.com`;
    const { access, password } = await registerAndOnboard(app, email);

    let csrf = await getCsrf(app);
    await request(app)
      .post("/api/v1/moments")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", authCookie(csrf.cookie, access))
      .set("X-CSRF-Token", csrf.token)
      .send({
        kind: "POSITIVE",
        categoryCode: "AFFECTION",
        note: "gone-soon",
        occurredAt: new Date().toISOString(),
        clientMutationId: randomUUID(),
      });

    csrf = await getCsrf(app);
    const created = await request(app)
      .post("/api/v1/share-snapshots")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", authCookie(csrf.cookie, access))
      .set("X-CSRF-Token", csrf.token)
      .send({ scope: "POSITIVE_ONLY", window: "30d", expiration: "7d" });
    const rawToken = created.body.token as string;

    csrf = await getCsrf(app);
    const summary = await request(app)
      .get("/api/v1/account/deletion-summary")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(summary.status).toBe(200);
    expect(summary.body.momentCount).toBe(1);
    expect(summary.body.shareSnapshotCount).toBe(1);

    csrf = await getCsrf(app);
    const deleted = await request(app)
      .post("/api/v1/account/delete")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", authCookie(csrf.cookie, access))
      .set("X-CSRF-Token", csrf.token)
      .send({ currentPassword: password, confirmationPhrase: "DELETE_MY_ACCOUNT" });

    expect(deleted.status).toBe(204);
    expect(getCookie(deleted, ACCESS_COOKIE)).toBeTruthy();

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(me.status).toBe(401);

    const resolve = await request(app)
      .post("/api/v1/public/share-snapshots/resolve")
      .send({ token: rawToken });
    expect(resolve.status).toBeGreaterThanOrEqual(400);

    csrf = await getCsrf(app);
    const reregister = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({
        email,
        password,
        displayName: "Again",
        acceptedTerms: true,
      });
    expect(reregister.status).toBe(201);
  });

  it("revokes all shares and hard-deletes an individual share record", async () => {
    const shares = createMemoryShareSnapshotRepository();
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
      shareSnapshotRepository: shares,
    });
    const { access } = await registerAndOnboard(app, `shares-${randomUUID()}@example.com`);

    let csrf = await getCsrf(app);
    await request(app)
      .post("/api/v1/moments")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", authCookie(csrf.cookie, access))
      .set("X-CSRF-Token", csrf.token)
      .send({
        kind: "POSITIVE",
        categoryCode: "AFFECTION",
        occurredAt: new Date().toISOString(),
        clientMutationId: randomUUID(),
      });

    csrf = await getCsrf(app);
    const created = await request(app)
      .post("/api/v1/share-snapshots")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", authCookie(csrf.cookie, access))
      .set("X-CSRF-Token", csrf.token)
      .send({ scope: "POSITIVE_ONLY", window: "30d", expiration: "7d" });
    const shareId = created.body.share.id as string;
    const rawToken = created.body.token as string;

    csrf = await getCsrf(app);
    const revokedAll = await request(app)
      .post("/api/v1/account/shares/revoke-all")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", authCookie(csrf.cookie, access))
      .set("X-CSRF-Token", csrf.token);
    expect(revokedAll.status).toBe(200);
    expect(revokedAll.body.revokedCount).toBe(1);

    const resolveAfterRevoke = await request(app)
      .post("/api/v1/public/share-snapshots/resolve")
      .send({ token: rawToken });
    expect(resolveAfterRevoke.status).toBeGreaterThanOrEqual(400);

    csrf = await getCsrf(app);
    const hardDeleted = await request(app)
      .delete(`/api/v1/account/shares/${shareId}`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", authCookie(csrf.cookie, access))
      .set("X-CSRF-Token", csrf.token);
    expect(hardDeleted.status).toBe(200);

    const listed = await request(app)
      .get("/api/v1/share-snapshots")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(listed.body.shares).toEqual([]);
  });
});
