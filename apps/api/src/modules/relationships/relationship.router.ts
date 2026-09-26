import { Router } from "express";
import type { ApiEnv } from "../../config/env";
import { createCsrfGuard, createRequireAuth } from "../../middleware/auth";
import type { AuthService } from "../auth/auth.service";
import { createRelationshipControllers } from "./relationship.controller";
import type { RelationshipService } from "./relationship.service";

export function createRelationshipRouter(
  env: ApiEnv,
  authService: AuthService,
  relationshipService: RelationshipService,
) {
  const router = Router();
  const controllers = createRelationshipControllers(relationshipService);
  const csrfGuard = createCsrfGuard(env);
  const requireAuth = createRequireAuth(authService);

  router.get("/active", requireAuth, controllers.getActive);
  router.post("/", requireAuth, csrfGuard, controllers.create);
  router.patch("/:profileId", requireAuth, csrfGuard, controllers.update);

  return router;
}
