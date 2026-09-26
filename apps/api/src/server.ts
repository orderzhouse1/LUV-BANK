import { createApp } from "./app";
import { loadEnv } from "./config/env";
import { logger } from "./lib/logger";
import { createPersistence } from "./persistence/create-persistence";

async function main() {
  const env = loadEnv();
  const persistence = await createPersistence(env);
  let shuttingDown = false;

  const app = createApp({
    env,
    authRepository: persistence.authRepository,
    momentRepository: persistence.momentRepository,
    nudgeSuppressionRepository: persistence.nudgeSuppressionRepository,
    reminderPreferenceRepository: persistence.reminderPreferenceRepository,
    shareSnapshotRepository: persistence.shareSnapshotRepository,
    prisma: persistence.prisma,
    isShuttingDown: () => shuttingDown,
  });

  const server = app.listen(env.API_PORT, env.API_HOST, () => {
    logger.info("api listening", {
      host: env.API_HOST,
      port: env.API_PORT,
      persistence: persistence.driver,
    });
  });

  server.requestTimeout = env.REQUEST_TIMEOUT_MS + 5_000;
  server.headersTimeout = env.REQUEST_TIMEOUT_MS + 10_000;

  let forceExitTimer: NodeJS.Timeout | undefined;

  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("api shutting down", { signal });

    forceExitTimer = setTimeout(() => {
      logger.error("api shutdown timed out; forcing exit");
      process.exit(1);
    }, env.SHUTDOWN_TIMEOUT_MS);
    forceExitTimer.unref();

    server.close(async (closeError) => {
      if (closeError) {
        logger.error("api server close failed", {
          name: closeError.name,
        });
      }
      try {
        if (persistence.prisma) {
          await persistence.prisma.$disconnect();
        }
      } catch {
        logger.warn("prisma disconnect failed during shutdown");
      }
      if (forceExitTimer) clearTimeout(forceExitTimer);
      process.exit(closeError ? 1 : 0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.error("api failed to start", {
    name: error instanceof Error ? error.name : "unknown",
    message: error instanceof Error ? error.message : "unknown error",
  });
  process.exit(1);
});
