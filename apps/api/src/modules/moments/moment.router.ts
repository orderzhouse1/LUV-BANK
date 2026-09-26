import { Router } from "express";
import type { ApiEnv } from "../../config/env";
import { createCsrfGuard, createRequireAuth } from "../../middleware/auth";
import type { AuthService } from "../auth/auth.service";
import { createMomentControllers } from "./moment.controller";
import type { MomentService } from "./moment.service";

export function createMomentRouter(
  env: ApiEnv,
  authService: AuthService,
  momentService: MomentService,
) {
  const router = Router();
  const controllers = createMomentControllers(momentService);
  const csrfGuard = createCsrfGuard(env);
  const requireAuth = createRequireAuth(authService);

  router.post("/", requireAuth, csrfGuard, controllers.create);
  router.get("/", requireAuth, controllers.list);
  router.get("/:momentId", requireAuth, controllers.getOne);
  router.patch("/:momentId", requireAuth, csrfGuard, controllers.update);
  router.delete("/:momentId", requireAuth, csrfGuard, controllers.remove);

  return router;
}
