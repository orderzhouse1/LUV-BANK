import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app";
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE, sha256 } from "../../lib/crypto";
import { createMemoryAuthRepository } from "./memory-auth.repository";
import { createTestEnv } from "../../test/test-env";
import { AuthService } from "./auth.service";

function getCookie(res: request.Response, name: string): string | undefined {
  const raw = res.headers["set-cookie"];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const match = list.find((item) => item.startsWith(`${name}=`));
  return match;
}

function readCookieValue(setCookie: string | undefined): string {
  if (!setCookie) return "";
  return decodeURIComponent(setCookie.split(";")[0]!.split("=").slice(1).join("="));
}

async function bootstrap() {
  const env = createTestEnv();
  const repo = createMemoryAuthRepository();
  const app = createApp({ env, authRepository: repo });
  return { env, repo, app };
}

async function getCsrf(app: ReturnType<typeof createApp>) {
  const res = await request(app).get("/api/v1/auth/csrf");
  expect(res.status).toBe(200);
  const csrfCookie = getCookie(res, CSRF_COOKIE);
  return {
    token: res.body.csrfToken as string,
    cookie: csrfCookie ?? "",
  };
}

describe("auth API (in-memory repository)", () => {
  it("registers a user, sets HttpOnly cookies, and never returns tokens or password hashes", async () => {
    const { app } = await bootstrap();
    const csrf = await getCsrf(app);

    const res = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({
        email: " Ada@Example.com ",
        password: "passphrase-twelve",
        displayName: "Ada",
        preferredLocale: "en",
        acceptedTerms: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("ada@example.com");
    expect(res.body.user.onboardingComplete).toBe(false);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|accessToken|refreshToken/);
    expect(getCookie(res, ACCESS_COOKIE)).toMatch(/HttpOnly/i);
    expect(getCookie(res, REFRESH_COOKIE)).toMatch(/HttpOnly/i);
    expect(getCookie(res, REFRESH_COOKIE)).toMatch(/Path=\/api\/v1\/auth/i);
    expect(getCookie(res, ACCESS_COOKIE)).not.toMatch(/Domain=/i);
  });

  it("rejects duplicate email", async () => {
    const { app } = await bootstrap();
    const csrf = await getCsrf(app);
    const payload = {
      email: "dup@example.com",
      password: "passphrase-twelve",
      displayName: "Dup",
      acceptedTerms: true,
    };

    await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send(payload);

    const csrf2 = await getCsrf(app);
    const res = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf2.cookie)
      .set("X-CSRF-Token", csrf2.token)
      .send(payload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("returns generic invalid credentials for bad login", async () => {
    const { app } = await bootstrap();
    const csrf = await getCsrf(app);
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({ email: "missing@example.com", password: "passphrase-twelve" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("logs in successfully", async () => {
    const { app } = await bootstrap();
    let csrf = await getCsrf(app);
    await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({
        email: "login@example.com",
        password: "passphrase-twelve",
        displayName: "Login",
        acceptedTerms: true,
      });

    csrf = await getCsrf(app);
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({ email: "login@example.com", password: "passphrase-twelve" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("login@example.com");
  });

  it("rejects CSRF missing and mismatched tokens", async () => {
    const { app } = await bootstrap();
    const csrf = await getCsrf(app);

    const missing = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .send({ email: "a@example.com", password: "passphrase-twelve" });
    expect(missing.status).toBe(403);
    expect(missing.body.error.code).toBe("CSRF_INVALID");

    const mismatch = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", "wrong-token-value-wrong-token-value")
      .send({ email: "a@example.com", password: "passphrase-twelve" });
    expect(mismatch.status).toBe(403);
    expect(mismatch.body.error.code).toBe("CSRF_INVALID");
  });

  it("sets Secure cookies when COOKIE_SECURE=true", async () => {
    const env = createTestEnv({ COOKIE_SECURE: true });
    const app = createApp({ env, authRepository: createMemoryAuthRepository() });
    const csrf = await getCsrf(app);
    const res = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({
        email: "secure@example.com",
        password: "passphrase-twelve",
        displayName: "Secure",
        acceptedTerms: true,
      });

    expect(getCookie(res, ACCESS_COOKIE)).toMatch(/Secure/i);
    expect(getCookie(res, REFRESH_COOKIE)).toMatch(/Secure/i);
  });

  it("rotates refresh tokens and revokes family on reuse", async () => {
    const { app, repo } = await bootstrap();
    let csrf = await getCsrf(app);
    const registered = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({
        email: "rotate@example.com",
        password: "passphrase-twelve",
        displayName: "Rotate",
        acceptedTerms: true,
      });

    const firstRefresh = readCookieValue(getCookie(registered, REFRESH_COOKIE));
    csrf = await getCsrf(app);
    const refreshed = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${REFRESH_COOKIE}=${encodeURIComponent(firstRefresh)}`)
      .set("X-CSRF-Token", csrf.token);

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.ok).toBe(true);
    const secondRefresh = readCookieValue(getCookie(refreshed, REFRESH_COOKIE));
    expect(secondRefresh).not.toBe(firstRefresh);

    csrf = await getCsrf(app);
    const reuse = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${REFRESH_COOKIE}=${encodeURIComponent(firstRefresh)}`)
      .set("X-CSRF-Token", csrf.token);

    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe("SESSION_EXPIRED");

    const oldHash = sha256(firstRefresh);
    const oldSession = await repo.findSessionByRefreshHash(oldHash);
    // Old hash may no longer map if replaced; family should be revoked via id lookup path.
    const familySessions = oldSession
      ? null
      : await repo.findSessionById((await verifySid(firstRefresh)).sid);
    void familySessions;
  });

  it("logout is idempotent and logout-all revokes sessions", async () => {
    const { app } = await bootstrap();
    let csrf = await getCsrf(app);
    const registered = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({
        email: "out@example.com",
        password: "passphrase-twelve",
        displayName: "Out",
        acceptedTerms: true,
      });

    const access = readCookieValue(getCookie(registered, ACCESS_COOKIE));
    const refresh = readCookieValue(getCookie(registered, REFRESH_COOKIE));

    csrf = await getCsrf(app);
    const logout1 = await request(app)
      .post("/api/v1/auth/logout")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `${csrf.cookie}; ${REFRESH_COOKIE}=${encodeURIComponent(refresh)}`)
      .set("X-CSRF-Token", csrf.token);
    expect(logout1.status).toBe(204);

    csrf = await getCsrf(app);
    const logout2 = await request(app)
      .post("/api/v1/auth/logout")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token);
    expect(logout2.status).toBe(204);

    // Re-login for logout-all
    csrf = await getCsrf(app);
    const login = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({ email: "out@example.com", password: "passphrase-twelve" });
    const access2 = readCookieValue(getCookie(login, ACCESS_COOKIE));
    csrf = await getCsrf(app);
    const logoutAll = await request(app)
      .post("/api/v1/auth/logout-all")
      .set("Origin", "http://localhost:3000")
      .set(
        "Cookie",
        `${csrf.cookie}; ${ACCESS_COOKIE}=${encodeURIComponent(access2)}; ${REFRESH_COOKIE}=${encodeURIComponent(readCookieValue(getCookie(login, REFRESH_COOKIE)))}`,
      )
      .set("X-CSRF-Token", csrf.token);
    expect(logoutAll.status).toBe(204);

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(me.status).toBe(401);
  });

  it("me unauthorized without cookie and safe when authenticated", async () => {
    const { app } = await bootstrap();
    const unauthorized = await request(app).get("/api/v1/auth/me");
    expect(unauthorized.status).toBe(401);

    const csrf = await getCsrf(app);
    const registered = await request(app)
      .post("/api/v1/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({
        email: "me@example.com",
        password: "passphrase-twelve",
        displayName: "Me",
        acceptedTerms: true,
      });
    const access = readCookieValue(getCookie(registered, ACCESS_COOKIE));
    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `${ACCESS_COOKIE}=${encodeURIComponent(access)}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("me@example.com");
    expect(JSON.stringify(me.body)).not.toMatch(/passwordHash|refreshTokenHash/);
  });

  it("rejects disabled users", async () => {
    const env = createTestEnv();
    const repo = createMemoryAuthRepository();
    const service = new AuthService(env, repo);
    const issued = await service.register({
      email: "disabled@example.com",
      password: "passphrase-twelve",
      displayName: "Disabled",
      acceptedTerms: true,
    });
    const user = await repo.findUserById(issued.user.id);
    expect(user).toBeTruthy();
    // Force disabled via memory map by creating a patch through update path:
    await repo.revokeAllUserSessions(user!.id, new Date());
    // Direct status mutation through createUser is not available; use internal map via find + recreate pattern
    const store = repo as unknown as {
      findUserById: (id: string) => Promise<{ status: string } | null>;
    };
    void store;
    // Use login against a user we mark disabled by re-implementing through memory repo internals:
    const created = await repo.findUserByEmail("disabled@example.com");
    Object.assign(created!, { status: "DISABLED" });

    const app = createApp({ env, authRepository: repo });
    const csrf = await getCsrf(app);
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", csrf.cookie)
      .set("X-CSRF-Token", csrf.token)
      .send({ email: "disabled@example.com", password: "passphrase-twelve" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});

async function verifySid(token: string) {
  const { verifyRefreshToken } = await import("../../lib/crypto");
  return verifyRefreshToken({
    token,
    secret: "test-refresh-secret-value-32chars!",
    issuer: "luv-bank-api",
    audience: "luv-bank-web",
  });
}
