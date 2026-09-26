import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { ApiEnv } from "../../config/env";
import { createCsrfGuard, createRequireAuth } from "../../middleware/auth";
import type { AuthService } from "../auth/auth.service";
import { createAccountControllers } from "./account.controller";
import type { AccountService } from "./account.service";

export function createAccountRouter(
  env: ApiEnv,
  authService: AuthService,
  accountService: AccountService,
) {
  const router = Router();
  const controllers = createAccountControllers(env, accountService);
  const csrfGuard = createCsrfGuard(env);
  const requireAuth = createRequireAuth(authService);

  const stepUpLimiter = rateLimit({
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    max: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: "RATE_LIMITED",
        message: "Too many attempts. Please try again later.",
      },
    },
  });

  router.get("/sessions", requireAuth, controllers.listSessions);
  router.post("/sessions/:sessionId/revoke", requireAuth, csrfGuard, controllers.revokeSession);
  router.post("/password", requireAuth, csrfGuard, stepUpLimiter, controllers.changePassword);
  router.post("/export", requireAuth, csrfGuard, stepUpLimiter, controllers.exportData);
  router.get("/deletion-summary", requireAuth, controllers.deletionSummary);
  router.post("/shares/revoke-all", requireAuth, csrfGuard, controllers.revokeAllShares);
  router.delete("/shares/:shareId", requireAuth, csrfGuard, controllers.hardDeleteShare);
  router.post("/delete", requireAuth, csrfGuard, stepUpLimiter, controllers.deleteAccount);

  return router;
}
