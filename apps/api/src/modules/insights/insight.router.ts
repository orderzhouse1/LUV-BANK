import { Router } from "express";
import type { ApiEnv } from "../../config/env";
import { createRequireAuth } from "../../middleware/auth";
import type { AuthService } from "../auth/auth.service";
import { createInsightControllers } from "./insight.controller";
import type { InsightService } from "./insight.service";

export function createInsightRouter(
  env: ApiEnv,
  authService: AuthService,
  insightService: InsightService,
) {
  const router = Router();
  const controllers = createInsightControllers(insightService);
  const requireAuth = createRequireAuth(authService);

  router.get("/summary", requireAuth, controllers.summary);

  return router;
}
