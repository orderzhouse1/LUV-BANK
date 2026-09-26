import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { ApiEnv } from "../../config/env";
import { createCsrfGuard, createRequireAuth } from "../../middleware/auth";
import type { AuthService } from "./auth.service";
import { createAuthControllers } from "./auth.controller";

export function createAuthRouter(env: ApiEnv, authService: AuthService) {
  const router = Router();
  const controllers = createAuthControllers(env, authService);
  const csrfGuard = createCsrfGuard(env);
  const requireAuth = createRequireAuth(authService);

  const authLimiter = rateLimit({
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

  router.get("/csrf", authLimiter, controllers.csrf);
  router.post("/register", authLimiter, csrfGuard, controllers.register);
  router.post("/login", authLimiter, csrfGuard, controllers.login);
  router.post("/refresh", authLimiter, csrfGuard, controllers.refresh);
  router.post("/logout", csrfGuard, controllers.logout);
  router.post("/logout-all", csrfGuard, requireAuth, controllers.logoutAll);
  router.get("/me", controllers.me);

  return router;
}
