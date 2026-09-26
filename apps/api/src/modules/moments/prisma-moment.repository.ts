import type { PrismaClient } from "@luv-bank/database";
import type { MomentCategoryCode, MomentKind } from "@luv-bank/validation";
import {
  decodeMomentCursor,
  encodeMomentCursor,
  type MomentListParams,
  type MomentRecord,
  type MomentRepository,
} from "./moment.types";

function mapMoment(row: {
  id: string;
  relationshipId: string;
  kind: MomentKind;
  categoryCode: string;
  note: string | null;
  occurredAt: Date;
  clientMutationId: string;
  payloadFingerprint: string;
  scoreImpact: number;
  scoringVersion: string;
  createdAt: Date;
  updatedAt: Date;
}): MomentRecord {
  return {
    id: row.id,
    relationshipId: row.relationshipId,
    kind: row.kind,
    categoryCode: row.categoryCode as MomentCategoryCode,
    note: row.note,
    occurredAt: row.occurredAt,
    clientMutationId: row.clientMutationId,
    payloadFingerprint: row.payloadFingerprint,
    scoreImpact: row.scoreImpact,
    scoringVersion: row.scoringVersion,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export function createPrismaMomentRepository(prisma: PrismaClient): MomentRepository {
  return {
    async create(input) {
      try {
        const created = await prisma.moment.create({
          data: {
            relationshipId: input.relationshipId,
            kind: input.kind,
            categoryCode: input.categoryCode,
            note: input.note,
            occurredAt: input.occurredAt,
            clientMutationId: input.clientMutationId,
            payloadFingerprint: input.payloadFingerprint,
            scoreImpact: input.scoreImpact,
            scoringVersion: input.scoringVersion,
          },
        });
        return { moment: mapMoment(created), created: true };
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
        const existing = await prisma.moment.findUnique({
          where: {
            relationshipId_clientMutationId: {
              relationshipId: input.relationshipId,
              clientMutationId: input.clientMutationId,
            },
          },
        });
        if (!existing) {
          throw error;
        }
        if (existing.payloadFingerprint !== input.payloadFingerprint) {
          const conflict = new Error("IDEMPOTENCY_CONFLICT");
          conflict.name = "IdempotencyConflict";
          throw conflict;
        }
        return { moment: mapMoment(existing), created: false };
      }
    },

    async findByIdForProfile(relationshipId, momentId) {
      const row = await prisma.moment.findFirst({
        where: { id: momentId, relationshipId },
      });
      return row ? mapMoment(row) : null;
    },

    async list(params: MomentListParams) {
      const where: Record<string, unknown> = {
        relationshipId: params.relationshipId,
      };
      if (params.kind) where.kind = params.kind;
      if (params.categoryCode) where.categoryCode = params.categoryCode;
      if (params.from || params.to) {
        where.occurredAt = {
          ...(params.from ? { gte: params.from } : {}),
          ...(params.to ? { lte: params.to } : {}),
        };
      }
      if (params.cursor) {
        const cursor = decodeMomentCursor(params.cursor);
        where.AND = [
          {
            OR: [
              { occurredAt: { lt: cursor.occurredAt } },
              { occurredAt: cursor.occurredAt, id: { lt: cursor.id } },
            ],
          },
        ];
      }

      const rows = await prisma.moment.findMany({
        where,
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        take: params.limit + 1,
      });
      const hasMore = rows.length > params.limit;
      const page = hasMore ? rows.slice(0, params.limit) : rows;
      const last = page[page.length - 1];
      return {
        items: page.map(mapMoment),
        nextCursor: hasMore && last ? encodeMomentCursor(last.occurredAt, last.id) : null,
      };
    },

    async listAllForProfile(relationshipId) {
      const rows = await prisma.moment.findMany({
        where: { relationshipId },
        orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
      });
      return rows.map(mapMoment);
    },

    async listAllForProfiles(relationshipIds) {
      if (relationshipIds.length === 0) return [];
      const rows = await prisma.moment.findMany({
        where: { relationshipId: { in: relationshipIds } },
        orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
      });
      return rows.map(mapMoment);
    },

    async deleteAllForProfiles(relationshipIds) {
      if (relationshipIds.length === 0) return 0;
      const result = await prisma.moment.deleteMany({
        where: { relationshipId: { in: relationshipIds } },
      });
      return result.count;
    },

    async update(relationshipId, momentId, patch) {
      const existing = await prisma.moment.findFirst({
        where: { id: momentId, relationshipId },
      });
      if (!existing) {
        return null;
      }
      const updated = await prisma.moment.update({
        where: { id: momentId },
        data: {
          kind: patch.kind,
          categoryCode: patch.categoryCode,
          note: patch.note === undefined ? undefined : patch.note,
          occurredAt: patch.occurredAt,
          scoreImpact: patch.scoreImpact,
          scoringVersion: patch.scoringVersion,
        },
      });
      return mapMoment(updated);
    },

    async delete(relationshipId, momentId) {
      const existing = await prisma.moment.findFirst({
        where: { id: momentId, relationshipId },
      });
      if (!existing) {
        return false;
      }
      await prisma.moment.delete({ where: { id: momentId } });
      return true;
    },
  };
}
