import { Router } from "express";
import type { ApiEnv } from "../../config/env";
import { createCsrfGuard, createRequireAuth } from "../../middleware/auth";
import type { AuthService } from "../auth/auth.service";
import { createNudgeControllers } from "./nudge.controller";
import type { NudgeService } from "./nudge.service";

export function createNudgeRouter(
  env: ApiEnv,
  authService: AuthService,
  nudgeService: NudgeService,
) {
  const router = Router();
  const controllers = createNudgeControllers(nudgeService);
  const csrfGuard = createCsrfGuard(env);
  const requireAuth = createRequireAuth(authService);

  router.get("/current", requireAuth, controllers.current);
  router.post("/suppress", requireAuth, csrfGuard, controllers.suppress);

  return router;
}
