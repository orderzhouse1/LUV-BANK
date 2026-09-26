import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app";
import { ACCESS_COOKIE, CSRF_COOKIE } from "../../lib/crypto";
import { createMemoryAuthRepository } from "../auth/memory-auth.repository";
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

async function registerUser(app: ReturnType<typeof createApp>, email: string) {
  const csrf = await getCsrf(app);
  const res = await request(app)
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
  const access = readCookieValue(getCookie(res, ACCESS_COOKIE));
  return {
    access,
    csrfCookie: getCookie(res, CSRF_COOKIE) ?? csrf.cookie,
    userId: res.body.user.id as string,
  };
}

describe("relationship ownership API", () => {
  it("creates an active profile, reads it, updates it, and blocks other users", async () => {
    const env = createTestEnv();
    const repo = createMemoryAuthRepository();
    const app = createApp({ env, authRepository: repo });

    const userA = await registerUser(app, "owner-a@example.com");
    let csrf = await getCsrf(app);

    const created = await request(app)
      .post("/api/v1/relationship-profiles")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(userA.access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        title: "Private bond",
        label: "home",
        partnerDisplayName: "Alias only",
      });

    expect(created.status).toBe(201);
    expect(created.body.profile.title).toBe("Private bond");
    const profileId = created.body.profile.id as string;

    const active = await request(app)
      .get("/api/v1/relationship-profiles/active")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(userA.access)}`);
    expect(active.status).toBe(200);
    expect(active.body.profile.id).toBe(profileId);

    csrf = await getCsrf(app);
    const updated = await request(app)
      .patch(`/api/v1/relationship-profiles/${profileId}`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(userA.access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({ title: "Updated private bond" });
    expect(updated.status).toBe(200);
    expect(updated.body.profile.title).toBe("Updated private bond");

    // Duplicate create returns the existing active profile (no second active profile).
    csrf = await getCsrf(app);
    const duplicate = await request(app)
      .post("/api/v1/relationship-profiles")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(userA.access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({ title: "Should not create another" });
    expect(duplicate.status).toBe(201);
    expect(duplicate.body.profile.id).toBe(profileId);
    expect(await repo.countActiveProfilesForUser(userA.userId)).toBe(1);

    const userB = await registerUser(app, "owner-b@example.com");
    csrf = await getCsrf(app);
    const forbidden = await request(app)
      .patch(`/api/v1/relationship-profiles/${profileId}`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(userB.access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({ title: "Hijack attempt" });
    expect(forbidden.status).toBe(404);
    expect(forbidden.body.error.code).toBe("PROFILE_NOT_FOUND");

    // Body-supplied userId must never override session ownership.
    csrf = await getCsrf(app);
    const spoof = await request(app)
      .post("/api/v1/relationship-profiles")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(userB.access)}`)
      .set("X-CSRF-Token", csrf.token)
      .send({
        title: "B profile",
        userId: userA.userId,
        ownerId: userA.userId,
      });
    expect(spoof.status).toBe(201);
    expect(spoof.body.profile.title).toBe("B profile");
    const spoofProfile = await repo.findProfileById(spoof.body.profile.id);
    expect(spoofProfile?.ownerId).toBe(userB.userId);
  });
});
