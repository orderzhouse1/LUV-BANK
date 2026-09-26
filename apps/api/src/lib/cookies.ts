import { stringifySetCookie } from "cookie";
import type { ApiEnv } from "../config/env";
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE, parseDurationToSeconds } from "./crypto";

export type CookieJar = Record<string, string | undefined>;

export function parseCookieHeader(header: string | undefined): CookieJar {
  if (!header) {
    return {};
  }
  const jar: CookieJar = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) {
      continue;
    }
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) {
      jar[key] = decodeURIComponent(value);
    }
  }
  return jar;
}

type CookieAttrs = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
  domain?: string;
};

function baseCookieAttrs(env: ApiEnv): CookieAttrs {
  const options: CookieAttrs = {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: "/",
  };
  // Empty COOKIE_DOMAIN means host-only — do not set Domain.
  if (env.COOKIE_DOMAIN) {
    options.domain = env.COOKIE_DOMAIN;
  }
  return options;
}

function serializeCookie(name: string, value: string, attrs: CookieAttrs): string {
  return stringifySetCookie({
    name,
    value,
    path: attrs.path,
    httpOnly: attrs.httpOnly,
    secure: attrs.secure,
    sameSite: attrs.sameSite,
    maxAge: attrs.maxAge,
    domain: attrs.domain,
  });
}

export function buildAuthCookieHeaders(input: {
  env: ApiEnv;
  accessToken: string;
  refreshToken: string;
  csrfToken?: string;
}): string[] {
  const base = baseCookieAttrs(input.env);
  const accessMaxAge = parseDurationToSeconds(input.env.JWT_ACCESS_TTL);
  const refreshMaxAge = parseDurationToSeconds(input.env.JWT_REFRESH_TTL);

  const headers = [
    serializeCookie(ACCESS_COOKIE, input.accessToken, {
      ...base,
      path: "/",
      maxAge: accessMaxAge,
    }),
    serializeCookie(REFRESH_COOKIE, input.refreshToken, {
      ...base,
      path: "/api/v1/auth",
      maxAge: refreshMaxAge,
    }),
  ];

  if (input.csrfToken) {
    headers.push(buildCsrfCookieHeader(input.env, input.csrfToken));
  }

  return headers;
}

export function buildCsrfCookieHeader(env: ApiEnv, token: string): string {
  const attrs: CookieAttrs = {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: "/",
    maxAge: parseDurationToSeconds(env.JWT_REFRESH_TTL),
  };
  if (env.COOKIE_DOMAIN) {
    attrs.domain = env.COOKIE_DOMAIN;
  }
  return serializeCookie(CSRF_COOKIE, token, attrs);
}

export function buildClearedAuthCookieHeaders(env: ApiEnv): string[] {
  const base = baseCookieAttrs(env);
  return [
    serializeCookie(ACCESS_COOKIE, "", { ...base, path: "/", maxAge: 0 }),
    serializeCookie(REFRESH_COOKIE, "", {
      ...base,
      path: "/api/v1/auth",
      maxAge: 0,
    }),
  ];
}
