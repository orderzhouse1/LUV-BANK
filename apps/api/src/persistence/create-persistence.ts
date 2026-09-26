import type { PrismaClient } from "@luv-bank/database";
import { createPrismaClient } from "@luv-bank/database";
import type { ApiEnv } from "../config/env";
import { createMemoryAuthRepository } from "../modules/auth/memory-auth.repository";
import { createPrismaAuthRepository } from "../modules/auth/prisma-auth.repository";
import type { AuthRepository } from "../modules/auth/auth.types";
import { createMemoryMomentRepository } from "../modules/moments/memory-moment.repository";
import { createPrismaMomentRepository } from "../modules/moments/prisma-moment.repository";
import type { MomentRepository } from "../modules/moments/moment.types";
import { createMemoryNudgeSuppressionRepository } from "../modules/nudges/memory-nudge-suppression.repository";
import { createPrismaNudgeSuppressionRepository } from "../modules/nudges/prisma-nudge-suppression.repository";
import type { NudgeSuppressionRepository } from "../modules/nudges/nudge.types";
import { createMemoryReminderPreferenceRepository } from "../modules/reminders/memory-reminder.repository";
import { createPrismaReminderPreferenceRepository } from "../modules/reminders/prisma-reminder.repository";
import type { ReminderPreferenceRepository } from "../modules/reminders/reminder.types";
import { createMemoryShareSnapshotRepository } from "../modules/shares/memory-share.repository";
import { createPrismaShareSnapshotRepository } from "../modules/shares/prisma-share.repository";
import type { ShareSnapshotRepository } from "../modules/shares/share.types";

export type PersistenceBundle = {
  driver: ApiEnv["PERSISTENCE_DRIVER"];
  prisma: PrismaClient | null;
  authRepository: AuthRepository;
  momentRepository: MomentRepository;
  nudgeSuppressionRepository: NudgeSuppressionRepository;
  reminderPreferenceRepository: ReminderPreferenceRepository;
  shareSnapshotRepository: ShareSnapshotRepository;
};

/**
 * Explicit persistence factory. Never silently falls back from prisma to memory.
 */
export async function createPersistence(env: ApiEnv): Promise<PersistenceBundle> {
  if (env.PERSISTENCE_DRIVER === "prisma") {
    if (!env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required when PERSISTENCE_DRIVER=prisma.");
    }
    const prisma = createPrismaClient(env.DATABASE_URL);
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      await prisma.$disconnect().catch(() => undefined);
      throw new Error(
        "PERSISTENCE_DRIVER=prisma could not connect to PostgreSQL. Refusing to fall back to memory.",
        { cause: error },
      );
    }

    return {
      driver: "prisma",
      prisma,
      authRepository: createPrismaAuthRepository(prisma),
      momentRepository: createPrismaMomentRepository(prisma),
      nudgeSuppressionRepository: createPrismaNudgeSuppressionRepository(prisma),
      reminderPreferenceRepository: createPrismaReminderPreferenceRepository(prisma),
      shareSnapshotRepository: createPrismaShareSnapshotRepository(prisma),
    };
  }

  if (env.NODE_ENV === "production") {
    throw new Error("PERSISTENCE_DRIVER=memory is not allowed in production.");
  }

  return {
    driver: "memory",
    prisma: null,
    authRepository: createMemoryAuthRepository(),
    momentRepository: createMemoryMomentRepository(),
    nudgeSuppressionRepository: createMemoryNudgeSuppressionRepository(),
    reminderPreferenceRepository: createMemoryReminderPreferenceRepository(),
    shareSnapshotRepository: createMemoryShareSnapshotRepository(),
  };
}
