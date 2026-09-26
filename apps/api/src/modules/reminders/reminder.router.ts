import { Router } from "express";
import type { ApiEnv } from "../../config/env";
import { createCsrfGuard, createRequireAuth } from "../../middleware/auth";
import type { AuthService } from "../auth/auth.service";
import { createReminderControllers } from "./reminder.controller";
import type { ReminderService } from "./reminder.service";

export function createReminderRouter(
  env: ApiEnv,
  authService: AuthService,
  reminderService: ReminderService,
) {
  const router = Router();
  const controllers = createReminderControllers(reminderService);
  const csrfGuard = createCsrfGuard(env);
  const requireAuth = createRequireAuth(authService);

  router.get("/preference", requireAuth, controllers.getPreference);
  router.put("/preference", requireAuth, csrfGuard, controllers.upsertPreference);
  router.post("/dismiss", requireAuth, csrfGuard, controllers.dismiss);
  router.post("/snooze", requireAuth, csrfGuard, controllers.snooze);

  return router;
}
