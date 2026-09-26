import { describe, expect, it } from "vitest";
import { buildAuthCookieHeaders, buildCsrfCookieHeader } from "./cookies";
import { createTestEnv } from "../test/test-env";

describe("cookie attribute helpers", () => {
  it("omits Domain when COOKIE_DOMAIN is empty", () => {
    const env = createTestEnv({ COOKIE_DOMAIN: undefined, COOKIE_SECURE: false });
    const headers = buildAuthCookieHeaders({
      env,
      accessToken: "access",
      refreshToken: "refresh",
      csrfToken: "csrf",
    });
    expect(headers.join("\n")).not.toMatch(/Domain=/i);
    expect(headers[0]).toMatch(/HttpOnly/i);
    expect(headers[1]).toMatch(/Path=\/api\/v1\/auth/i);
  });

  it("sets Secure in production-like config", () => {
    const env = createTestEnv({ COOKIE_SECURE: true, COOKIE_DOMAIN: "example.com" });
    const header = buildCsrfCookieHeader(env, "csrf-token");
    expect(header).toMatch(/Secure/i);
    expect(header).toMatch(/Domain=example.com/i);
    expect(header).not.toMatch(/HttpOnly/i);
  });
});
