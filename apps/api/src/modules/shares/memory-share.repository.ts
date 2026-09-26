import { randomUUID } from "node:crypto";
import type { PrivateShareSnapshotPayload } from "@luv-bank/validation";
import type {
  ShareSnapshotCreateInput,
  ShareSnapshotRecord,
  ShareSnapshotRepository,
} from "./share.types";

export function createMemoryShareSnapshotRepository(): ShareSnapshotRepository {
  const byId = new Map<string, ShareSnapshotRecord>();

  return {
    async create(input: ShareSnapshotCreateInput) {
      const now = new Date();
      const record: ShareSnapshotRecord = {
        id: randomUUID(),
        relationshipId: input.relationshipId,
        createdById: input.createdById,
        scope: input.scope,
        window: input.window,
        snapshotVersion: input.snapshotVersion,
        payload: input.payload,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        revokedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      byId.set(record.id, record);
      return { ...record, payload: structuredClone(record.payload) };
    },

    async listByRelationshipId(relationshipId) {
      return [...byId.values()]
        .filter((row) => row.relationshipId === relationshipId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((row) => ({ ...row, payload: structuredClone(row.payload) }));
    },

    async listByRelationshipIds(relationshipIds) {
      const idSet = new Set(relationshipIds);
      return [...byId.values()]
        .filter((row) => idSet.has(row.relationshipId))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((row) => ({ ...row, payload: structuredClone(row.payload) }));
    },

    async findByIdForRelationship(id, relationshipId) {
      const row = byId.get(id);
      if (!row || row.relationshipId !== relationshipId) return null;
      return { ...row, payload: structuredClone(row.payload) };
    },

    async findByIdForProfiles(id, relationshipIds) {
      const row = byId.get(id);
      if (!row || !relationshipIds.includes(row.relationshipId)) return null;
      return { ...row, payload: structuredClone(row.payload) };
    },

    async findByTokenHash(tokenHash) {
      const row = [...byId.values()].find((item) => item.tokenHash === tokenHash);
      return row ? { ...row, payload: structuredClone(row.payload) } : null;
    },

    async revoke(id, relationshipId, revokedAt) {
      const row = byId.get(id);
      if (!row || row.relationshipId !== relationshipId) return null;
      const updated: ShareSnapshotRecord = {
        ...row,
        revokedAt,
        updatedAt: revokedAt,
      };
      byId.set(id, updated);
      return {
        ...updated,
        payload: structuredClone(updated.payload) as PrivateShareSnapshotPayload,
      };
    },

    async revokeAllActiveForProfiles(relationshipIds, revokedAt) {
      const idSet = new Set(relationshipIds);
      let count = 0;
      for (const [id, row] of byId) {
        if (!idSet.has(row.relationshipId)) continue;
        if (row.revokedAt) continue;
        if (row.expiresAt.getTime() <= revokedAt.getTime()) continue;
        byId.set(id, { ...row, revokedAt, updatedAt: revokedAt });
        count += 1;
      }
      return count;
    },

    async hardDelete(id, relationshipIds) {
      const row = byId.get(id);
      if (!row || !relationshipIds.includes(row.relationshipId)) return false;
      byId.delete(id);
      return true;
    },

    async deleteAllForProfiles(relationshipIds) {
      const idSet = new Set(relationshipIds);
      let count = 0;
      for (const [id, row] of byId) {
        if (idSet.has(row.relationshipId)) {
          byId.delete(id);
          count += 1;
        }
      }
      return count;
    },
  };
}
