import { Router } from "express";
import { createHealthHandlers, type HealthDeps } from "./health.controller";

export function createHealthRouter(deps: HealthDeps) {
  const { healthHandler, liveHandler, readyHandler } = createHealthHandlers(deps);
  const router = Router();
  router.get("/", healthHandler);
  router.get("/live", liveHandler);
  router.get("/ready", readyHandler);
  return router;
}
