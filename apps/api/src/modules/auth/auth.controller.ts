import type { RequestHandler } from "express";
import {
  authSessionResponseSchema,
  csrfResponseSchema,
  loginRequestSchema,
  refreshResponseSchema,
  registerRequestSchema,
} from "@luv-bank/validation";
import type { ApiEnv } from "../../config/env";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "../../lib/crypto";
import {
  buildAuthCookieHeaders,
  buildClearedAuthCookieHeaders,
  buildCsrfCookieHeader,
} from "../../lib/cookies";
import type { AuthedRequest } from "../../middleware/auth";
import type { AuthService } from "./auth.service";

export function createAuthControllers(env: ApiEnv, authService: AuthService) {
  const csrf: RequestHandler = (_req, res) => {
    const csrfToken = authService.issueCsrfToken();
    res.setHeader("Set-Cookie", buildCsrfCookieHeader(env, csrfToken));
    res.status(200).json(csrfResponseSchema.parse({ csrfToken }));
  };

  const register: RequestHandler = async (req, res, next) => {
    try {
      const body = registerRequestSchema.parse(req.body);
      const issued = await authService.register(body);
      const cookies = buildAuthCookieHeaders({
        env,
        accessToken: issued.accessToken,
        refreshToken: issued.refreshToken,
        csrfToken: issued.csrfToken,
      });
      res.setHeader("Set-Cookie", cookies);
      res.status(201).json(authSessionResponseSchema.parse({ user: issued.user }));
    } catch (error) {
      next(error);
    }
  };

  const login: RequestHandler = async (req, res, next) => {
    try {
      const body = loginRequestSchema.parse(req.body);
      const issued = await authService.login(body);
      const cookies = buildAuthCookieHeaders({
        env,
        accessToken: issued.accessToken,
        refreshToken: issued.refreshToken,
        csrfToken: issued.csrfToken,
      });
      res.setHeader("Set-Cookie", cookies);
      res.status(200).json(authSessionResponseSchema.parse({ user: issued.user }));
    } catch (error) {
      next(error);
    }
  };

  const refresh: RequestHandler = async (req, res, next) => {
    try {
      const cookies = (req as AuthedRequest).cookies;
      const rotated = await authService.refresh(cookies[REFRESH_COOKIE]);
      const setCookies = buildAuthCookieHeaders({
        env,
        accessToken: rotated.accessToken,
        refreshToken: rotated.refreshToken,
      });
      res.setHeader("Set-Cookie", setCookies);
      res.status(200).json(refreshResponseSchema.parse({ ok: true, userId: rotated.userId }));
    } catch (error) {
      res.setHeader("Set-Cookie", buildClearedAuthCookieHeaders(env));
      next(error);
    }
  };

  const logout: RequestHandler = async (req, res, next) => {
    try {
      const cookies = (req as AuthedRequest).cookies;
      await authService.logout(cookies[REFRESH_COOKIE]);
      res.setHeader("Set-Cookie", buildClearedAuthCookieHeaders(env));
      res.status(204).send();
    } catch (error) {
      res.setHeader("Set-Cookie", buildClearedAuthCookieHeaders(env));
      next(error);
    }
  };

  const logoutAll: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as AuthedRequest).authUser;
      if (!user) {
        res
          .status(401)
          .json({ error: { code: "UNAUTHENTICATED", message: "Authentication required." } });
        return;
      }
      await authService.logoutAll(user.id);
      res.setHeader("Set-Cookie", buildClearedAuthCookieHeaders(env));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  const me: RequestHandler = async (req, res, next) => {
    try {
      const cookies = (req as AuthedRequest).cookies;
      const payload = await authService.me(cookies[ACCESS_COOKIE]);
      res.status(200).json(authSessionResponseSchema.parse(payload));
    } catch (error) {
      next(error);
    }
  };

  return { csrf, register, login, refresh, logout, logoutAll, me };
}
