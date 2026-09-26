import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { ApiEnv } from "../../config/env";
import { createCsrfGuard, createRequireAuth } from "../../middleware/auth";
import type { AuthService } from "../auth/auth.service";
import { createShareControllers } from "./share.controller";
import type { ShareService } from "./share.service";

export function createShareRouter(
  env: ApiEnv,
  authService: AuthService,
  shareService: ShareService,
) {
  const router = Router();
  const controllers = createShareControllers(shareService);
  const csrfGuard = createCsrfGuard(env);
  const requireAuth = createRequireAuth(authService);

  router.post("/preview", requireAuth, csrfGuard, controllers.preview);
  router.post("/", requireAuth, csrfGuard, controllers.create);
  router.get("/", requireAuth, controllers.list);
  router.post("/:shareId/revoke", requireAuth, csrfGuard, controllers.revoke);

  return router;
}

export function createPublicShareRouter(shareService: ShareService) {
  const router = Router();
  const controllers = createShareControllers(shareService);
  const resolveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.post("/resolve", resolveLimiter, controllers.resolve);

  return router;
}
