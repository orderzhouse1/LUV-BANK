import type { PrismaClient } from "@luv-bank/database";
import {
  privateShareSnapshotPayloadSchema,
  type PrivateShareSnapshotPayload,
  type ShareScopeCode,
  type ShareWindow,
} from "@luv-bank/validation";
import type { ShareSnapshotRecord, ShareSnapshotRepository } from "./share.types";

function mapRow(row: {
  id: string;
  relationshipId: string;
  createdById: string;
  scope: string;
  window: string;
  snapshotVersion: string;
  payload: unknown;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ShareSnapshotRecord {
  return {
    id: row.id,
    relationshipId: row.relationshipId,
    createdById: row.createdById,
    scope: row.scope as ShareScopeCode,
    window: row.window as ShareWindow,
    snapshotVersion: row.snapshotVersion,
    payload: privateShareSnapshotPayloadSchema.parse(row.payload),
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createPrismaShareSnapshotRepository(prisma: PrismaClient): ShareSnapshotRepository {
  return {
    async create(input) {
      const row = await prisma.shareSnapshot.create({
        data: {
          relationshipId: input.relationshipId,
          createdById: input.createdById,
          scope: input.scope,
          window: input.window,
          snapshotVersion: input.snapshotVersion,
          payload: input.payload,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        },
      });
      return mapRow(row);
    },

    async listByRelationshipId(relationshipId) {
      const rows = await prisma.shareSnapshot.findMany({
        where: { relationshipId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(mapRow);
    },

    async listByRelationshipIds(relationshipIds) {
      if (relationshipIds.length === 0) return [];
      const rows = await prisma.shareSnapshot.findMany({
        where: { relationshipId: { in: relationshipIds } },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(mapRow);
    },

    async findByIdForRelationship(id, relationshipId) {
      const row = await prisma.shareSnapshot.findFirst({
        where: { id, relationshipId },
      });
      return row ? mapRow(row) : null;
    },

    async findByIdForProfiles(id, relationshipIds) {
      if (relationshipIds.length === 0) return null;
      const row = await prisma.shareSnapshot.findFirst({
        where: { id, relationshipId: { in: relationshipIds } },
      });
      return row ? mapRow(row) : null;
    },

    async findByTokenHash(tokenHash) {
      const row = await prisma.shareSnapshot.findUnique({ where: { tokenHash } });
      return row ? mapRow(row) : null;
    },

    async revoke(id, relationshipId, revokedAt) {
      const existing = await prisma.shareSnapshot.findFirst({
        where: { id, relationshipId },
      });
      if (!existing) return null;
      const row = await prisma.shareSnapshot.update({
        where: { id },
        data: { revokedAt },
      });
      return mapRow(row);
    },

    async revokeAllActiveForProfiles(relationshipIds, revokedAt) {
      if (relationshipIds.length === 0) return 0;
      const result = await prisma.shareSnapshot.updateMany({
        where: {
          relationshipId: { in: relationshipIds },
          revokedAt: null,
          expiresAt: { gt: revokedAt },
        },
        data: { revokedAt },
      });
      return result.count;
    },

    async hardDelete(id, relationshipIds) {
      if (relationshipIds.length === 0) return false;
      const existing = await prisma.shareSnapshot.findFirst({
        where: { id, relationshipId: { in: relationshipIds } },
      });
      if (!existing) return false;
      await prisma.shareSnapshot.delete({ where: { id } });
      return true;
    },

    async deleteAllForProfiles(relationshipIds) {
      if (relationshipIds.length === 0) return 0;
      const result = await prisma.shareSnapshot.deleteMany({
        where: { relationshipId: { in: relationshipIds } },
      });
      return result.count;
    },
  };
}

export type { PrivateShareSnapshotPayload };
