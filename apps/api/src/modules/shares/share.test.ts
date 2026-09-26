import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { PRIVATE_SHARE_SNAPSHOT_V1 } from "@luv-bank/validation";
import { apiEnvSchema } from "@luv-bank/config";
import { createApp } from "../../app";
import { ACCESS_COOKIE, CSRF_COOKIE, sha256 } from "../../lib/crypto";
import { createMemoryAuthRepository } from "../auth/memory-auth.repository";
import { createMemoryMomentRepository } from "../moments/memory-moment.repository";
import { createMemoryShareSnapshotRepository } from "./memory-share.repository";
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

describe("share snapshots API", () => {
  it("previews and creates POSITIVE_ONLY without notes or identity", async () => {
    const shares = createMemoryShareSnapshotRepository();
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
      shareSnapshotRepository: shares,
    });
    const { access } = await registerAndOnboard(app, `share-pos-${randomUUID()}@example.com`);

    await createMoment(app, access, {
      kind: "POSITIVE",
      categoryCode: "AFFECTION",
      note: "secret-note-never-share",
      occurredAt: new Date().toISOString(),
      clientMutationId: randomUUID(),
    });
    await createMoment(app, access, {
      kind: "DIFFICULT",
      categoryCode: "ARGUMENT",
      note: "another-secret",
      occurredAt: new Date().toISOString(),
      clientMutationId: randomUUID(),
    });

    let csrf = await getCsrf(app);
    const preview = await request(app)
      .post("/api/v1/share-snapshots/preview")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({ scope: "POSITIVE_ONLY", window: "30d", expiration: "7d" });

    expect(preview.status).toBe(200);
    expect(preview.headers["cache-control"]).toBe("no-store");
    expect(preview.body.payload.scope).toBe("POSITIVE_ONLY");
    expect(preview.body.payload.period.positiveMomentCount).toBe(1);
    expect(preview.body.payload).not.toHaveProperty("netBalance");
    expect(JSON.stringify(preview.body)).not.toMatch(
      /secret-note|another-secret|Private bond|Owner|Gottman|toxic/i,
    );

    csrf = await getCsrf(app);
    const created = await request(app)
      .post("/api/v1/share-snapshots")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({ scope: "POSITIVE_ONLY", window: "30d", expiration: "7d" });

    expect(created.status).toBe(201);
    expect(created.body.share.snapshotVersion).toBe(PRIVATE_SHARE_SNAPSHOT_V1);
    expect(created.body.share.status).toBe("ACTIVE");
    expect(created.body.token.length).toBeGreaterThanOrEqual(32);

    const listed = await request(app)
      .get("/api/v1/share-snapshots")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(listed.status).toBe(200);
    expect(listed.body.shares).toHaveLength(1);
    expect(JSON.stringify(listed.body)).not.toContain(created.body.token);

    const stored = await shares.findByTokenHash(sha256(created.body.token));
    expect(stored).not.toBeNull();
    expect(JSON.stringify(stored)).not.toContain(created.body.token);
    expect(JSON.stringify(stored?.payload)).not.toContain("secret-note");
  });

  it("resolves publicly, then fails after revoke and for expired shares", async () => {
    const shares = createMemoryShareSnapshotRepository();
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
      shareSnapshotRepository: shares,
    });
    const { access } = await registerAndOnboard(app, `share-pub-${randomUUID()}@example.com`);

    await createMoment(app, access, {
      kind: "POSITIVE",
      categoryCode: "SUPPORT",
      occurredAt: new Date().toISOString(),
      clientMutationId: randomUUID(),
    });

    const csrf = await getCsrf(app);
    const created = await request(app)
      .post("/api/v1/share-snapshots")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        scope: "SELECTED_PERIOD_SUMMARY",
        window: "7d",
        expiration: "1d",
      });

    const resolved = await request(app)
      .post("/api/v1/public/share-snapshots/resolve")
      .send({ token: created.body.token });
    expect(resolved.status).toBe(200);
    expect(resolved.headers["cache-control"]).toBe("no-store");
    expect(resolved.body.payload.scope).toBe("SELECTED_PERIOD_SUMMARY");
    expect(JSON.stringify(resolved.body)).not.toMatch(/note|token|email|relationshipId/i);

    const csrf2 = await getCsrf(app);
    const revoked = await request(app)
      .post(`/api/v1/share-snapshots/${created.body.share.id}/revoke`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf2.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf2.token)
      .send({});
    expect(revoked.status).toBe(200);
    expect(revoked.body.share.status).toBe("REVOKED");

    const afterRevoke = await request(app)
      .post("/api/v1/public/share-snapshots/resolve")
      .send({ token: created.body.token });
    expect(afterRevoke.status).toBe(404);
    expect(afterRevoke.body.error.code).toBe("SHARE_UNAVAILABLE");
  });

  it("keeps snapshots immutable after later moment edits", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
    });
    const { access } = await registerAndOnboard(app, `share-imm-${randomUUID()}@example.com`);

    await createMoment(app, access, {
      kind: "POSITIVE",
      categoryCode: "AFFECTION",
      occurredAt: new Date().toISOString(),
      clientMutationId: randomUUID(),
    });

    const csrf = await getCsrf(app);
    const created = await request(app)
      .post("/api/v1/share-snapshots")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        scope: "EXTENDED_BALANCE_SUMMARY",
        window: "30d",
        expiration: "30d",
      });

    const beforeNet = created.body.payload.currentPeriod.netBalance as number;

    await createMoment(app, access, {
      kind: "DIFFICULT",
      categoryCode: "TENSION",
      occurredAt: new Date().toISOString(),
      clientMutationId: randomUUID(),
    });

    const resolved = await request(app)
      .post("/api/v1/public/share-snapshots/resolve")
      .send({ token: created.body.token });
    expect(resolved.body.payload.currentPeriod.netBalance).toBe(beforeNet);
  });

  it("requires CSRF for create and rejects unknown snapshot versions", async () => {
    const app = createApp({
      env: createTestEnv(),
      authRepository: createMemoryAuthRepository(),
      momentRepository: createMemoryMomentRepository(),
    });
    const { access } = await registerAndOnboard(app, `share-csrf-${randomUUID()}@example.com`);

    const res = await request(app)
      .post("/api/v1/share-snapshots")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`)
      .send({ scope: "POSITIVE_ONLY", window: "30d", expiration: "7d" });
    expect(res.status).toBe(403);

    expect(() =>
      apiEnvSchema.parse({
        NODE_ENV: "development",
        API_PUBLIC_URL: "http://localhost:4000",
        CORS_ORIGINS: "http://localhost:3000",
        PERSISTENCE_DRIVER: "memory",
        JWT_ACCESS_SECRET: "dev-access-secret-value-32chars!!!",
        JWT_REFRESH_SECRET: "dev-refresh-secret-value-32chars!!",
        CSRF_SECRET: "dev-csrf-secret-value-32chars!!!!!!",
        ACTIVE_SHARE_SNAPSHOT_VERSION: "UNKNOWN_SHARE",
      }),
    ).toThrow();
  });
});
