import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import type { PrismaClient } from "@luv-bank/database";
import type { ApiEnv } from "./config/env";
import { AppError } from "./errors/app-error";
import { errorHandler } from "./errors/error-handler";
import { attachCookies } from "./middleware/auth";
import { requestIdMiddleware } from "./middleware/request-id";
import { requestTimeoutMiddleware } from "./middleware/request-timeout";
import { AccountService } from "./modules/account/account.service";
import { createAccountRouter } from "./modules/account/account.router";
import { AuthService } from "./modules/auth/auth.service";
import type { AuthRepository } from "./modules/auth/auth.types";
import { createMemoryAuthRepository } from "./modules/auth/memory-auth.repository";
import { createAuthRouter } from "./modules/auth/auth.router";
import { BalanceService } from "./modules/balance/balance.service";
import { createBalanceRouter } from "./modules/balance/balance.router";
import { createHealthRouter } from "./modules/health/health.router";
import { InsightService } from "./modules/insights/insight.service";
import { createInsightRouter } from "./modules/insights/insight.router";
import { createMemoryMomentRepository } from "./modules/moments/memory-moment.repository";
import { MomentService } from "./modules/moments/moment.service";
import type { MomentRepository } from "./modules/moments/moment.types";
import { createMomentRouter } from "./modules/moments/moment.router";
import { createMemoryNudgeSuppressionRepository } from "./modules/nudges/memory-nudge-suppression.repository";
import { NudgeService } from "./modules/nudges/nudge.service";
import type { NudgeSuppressionRepository } from "./modules/nudges/nudge.types";
import { createNudgeRouter } from "./modules/nudges/nudge.router";
import { createMemoryReminderPreferenceRepository } from "./modules/reminders/memory-reminder.repository";
import { ReminderService } from "./modules/reminders/reminder.service";
import type { ReminderPreferenceRepository } from "./modules/reminders/reminder.types";
import { createReminderRouter } from "./modules/reminders/reminder.router";
import { RelationshipService } from "./modules/relationships/relationship.service";
import { createRelationshipRouter } from "./modules/relationships/relationship.router";
import { createMemoryShareSnapshotRepository } from "./modules/shares/memory-share.repository";
import { ShareService } from "./modules/shares/share.service";
import type { ShareSnapshotRepository } from "./modules/shares/share.types";
import { createPublicShareRouter, createShareRouter } from "./modules/shares/share.router";

export type CreateAppOptions = {
  env: ApiEnv;
  authRepository?: AuthRepository;
  momentRepository?: MomentRepository;
  nudgeSuppressionRepository?: NudgeSuppressionRepository;
  reminderPreferenceRepository?: ReminderPreferenceRepository;
  shareSnapshotRepository?: ShareSnapshotRepository;
  prisma?: PrismaClient | null;
  isShuttingDown?: () => boolean;
};

export function createApp(options: CreateAppOptions) {
  const { env } = options;

  if (env.PERSISTENCE_DRIVER === "prisma") {
    const missing =
      !options.authRepository ||
      !options.momentRepository ||
      !options.nudgeSuppressionRepository ||
      !options.reminderPreferenceRepository ||
      !options.shareSnapshotRepository;
    if (missing) {
      throw new Error(
        "PERSISTENCE_DRIVER=prisma requires explicit Prisma repositories; refusing memory defaults.",
      );
    }
  }

  const authRepository = options.authRepository ?? createMemoryAuthRepository();
  const momentRepository = options.momentRepository ?? createMemoryMomentRepository();
  const nudgeSuppressionRepository =
    options.nudgeSuppressionRepository ?? createMemoryNudgeSuppressionRepository();
  const reminderPreferenceRepository =
    options.reminderPreferenceRepository ?? createMemoryReminderPreferenceRepository();
  const shareSnapshotRepository =
    options.shareSnapshotRepository ?? createMemoryShareSnapshotRepository();
  const authService = new AuthService(env, authRepository);
  const relationshipService = new RelationshipService(authRepository);
  const momentService = new MomentService(authRepository, momentRepository);
  const balanceService = new BalanceService(authRepository, momentRepository);
  const insightService = new InsightService(env, authRepository, momentRepository);
  const nudgeService = new NudgeService(
    env,
    authRepository,
    momentRepository,
    insightService,
    nudgeSuppressionRepository,
  );
  const reminderService = new ReminderService(authRepository, reminderPreferenceRepository);
  const shareService = new ShareService(
    env,
    authRepository,
    momentRepository,
    shareSnapshotRepository,
  );
  const accountService = new AccountService(
    env,
    authRepository,
    momentRepository,
    nudgeSuppressionRepository,
    reminderPreferenceRepository,
    shareSnapshotRepository,
  );

  const app = express();

  app.disable("x-powered-by");

  // Never use unconditional trust proxy `true`. Default 0; production behind a
  // single reverse proxy should set TRUST_PROXY_HOPS=1.
  if (env.TRUST_PROXY_HOPS > 0) {
    app.set("trust proxy", env.TRUST_PROXY_HOPS);
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }));
  app.use(requestTimeoutMiddleware(env.REQUEST_TIMEOUT_MS));
  app.use(requestIdMiddleware);
  app.use(attachCookies);

  app.use(
    rateLimit({
      windowMs: env.GLOBAL_RATE_LIMIT_WINDOW_MS,
      limit: env.GLOBAL_RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(
    "/api/v1/health",
    createHealthRouter({
      env,
      prisma: options.prisma ?? null,
      isShuttingDown: options.isShuttingDown ?? (() => false),
    }),
  );
  app.use("/api/v1/auth", createAuthRouter(env, authService));
  app.use(
    "/api/v1/relationship-profiles",
    createRelationshipRouter(env, authService, relationshipService),
  );
  app.use("/api/v1/moments", createMomentRouter(env, authService, momentService));
  app.use("/api/v1/balance", createBalanceRouter(env, authService, balanceService));
  app.use("/api/v1/insights", createInsightRouter(env, authService, insightService));
  app.use("/api/v1/nudges", createNudgeRouter(env, authService, nudgeService));
  app.use("/api/v1/reminders", createReminderRouter(env, authService, reminderService));
  app.use("/api/v1/share-snapshots", createShareRouter(env, authService, shareService));
  app.use("/api/v1/public/share-snapshots", createPublicShareRouter(shareService));
  app.use("/api/v1/account", createAccountRouter(env, authService, accountService));

  app.use((_req, _res, next) => {
    next(new AppError(404, "NOT_FOUND", "Resource not found."));
  });

  app.use(errorHandler);

  return app;
}
