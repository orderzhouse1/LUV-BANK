import { Router } from "express";
import type { ApiEnv } from "../../config/env";
import { createRequireAuth } from "../../middleware/auth";
import type { AuthService } from "../auth/auth.service";
import { createBalanceControllers } from "./balance.controller";
import type { BalanceService } from "./balance.service";

export function createBalanceRouter(
  env: ApiEnv,
  authService: AuthService,
  balanceService: BalanceService,
) {
  const router = Router();
  const controllers = createBalanceControllers(balanceService);
  const requireAuth = createRequireAuth(authService);

  router.get("/summary", requireAuth, controllers.summary);

  return router;
}
