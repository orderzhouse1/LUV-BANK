import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";
import { ACCESS_COOKIE, CSRF_COOKIE, safeEqual } from "../lib/crypto";
import { parseCookieHeader } from "../lib/cookies";
import type { AuthService } from "../modules/auth/auth.service";
import type { UserRecord } from "../modules/auth/auth.types";
import type { ApiEnv } from "../config/env";

export type AuthedRequest = Request & {
  authUser?: UserRecord;
  authSessionId?: string;
  cookies: Record<string, string | undefined>;
};

export function attachCookies(req: Request, _res: Response, next: NextFunction): void {
  (req as AuthedRequest).cookies = parseCookieHeader(req.headers.cookie);
  next();
}

export function createCsrfGuard(env: ApiEnv) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const method = req.method.toUpperCase();
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      next();
      return;
    }

    const origin = req.headers.origin;
    if (origin && !env.CORS_ORIGINS.includes(origin)) {
      next(new AppError(403, "CSRF_INVALID", "Invalid request origin."));
      return;
    }

    const cookies = (req as AuthedRequest).cookies ?? parseCookieHeader(req.headers.cookie);
    const cookieToken = cookies[CSRF_COOKIE];
    const headerToken = req.header("x-csrf-token");

    if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
      next(new AppError(403, "CSRF_INVALID", "Invalid CSRF token."));
      return;
    }

    next();
  };
}

export function createRequireAuth(authService: AuthService) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const cookies = (req as AuthedRequest).cookies ?? parseCookieHeader(req.headers.cookie);
      const context = await authService.requireAuthContext(cookies[ACCESS_COOKIE]);
      (req as AuthedRequest).authUser = context.user;
      (req as AuthedRequest).authSessionId = context.sessionId;
      next();
    } catch (error) {
      next(error);
    }
  };
}
