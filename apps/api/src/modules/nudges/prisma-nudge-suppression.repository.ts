import type { PrismaClient } from "@luv-bank/database";
import type { NudgeCode } from "@luv-bank/validation";
import type { NudgeSuppressionRecord, NudgeSuppressionRepository } from "./nudge.types";

function mapRow(row: {
  id: string;
  relationshipId: string;
  nudgeCode: string;
  suppressedUntil: Date;
  createdAt: Date;
  updatedAt: Date;
}): NudgeSuppressionRecord {
  return {
    id: row.id,
    relationshipId: row.relationshipId,
    nudgeCode: row.nudgeCode as NudgeCode,
    suppressedUntil: row.suppressedUntil,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createPrismaNudgeSuppressionRepository(
  prisma: PrismaClient,
): NudgeSuppressionRepository {
  return {
    async findActive(relationshipId, nudgeCode, now) {
      const row = await prisma.nudgeSuppression.findFirst({
        where: {
          relationshipId,
          nudgeCode,
          suppressedUntil: { gt: now },
        },
      });
      return row ? mapRow(row) : null;
    },

    async upsert(input) {
      const row = await prisma.nudgeSuppression.upsert({
        where: {
          relationshipId_nudgeCode: {
            relationshipId: input.relationshipId,
            nudgeCode: input.nudgeCode,
          },
        },
        create: {
          relationshipId: input.relationshipId,
          nudgeCode: input.nudgeCode,
          suppressedUntil: input.suppressedUntil,
        },
        update: {
          suppressedUntil: input.suppressedUntil,
        },
      });
      return mapRow(row);
    },

    async listByRelationshipIds(relationshipIds) {
      if (relationshipIds.length === 0) return [];
      const rows = await prisma.nudgeSuppression.findMany({
        where: { relationshipId: { in: relationshipIds } },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(mapRow);
    },

    async deleteAllForProfiles(relationshipIds) {
      if (relationshipIds.length === 0) return 0;
      const result = await prisma.nudgeSuppression.deleteMany({
        where: { relationshipId: { in: relationshipIds } },
      });
      return result.count;
    },
  };
}
