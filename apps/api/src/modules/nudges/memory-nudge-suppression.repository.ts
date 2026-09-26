import { randomUUID } from "node:crypto";
import type { NudgeCode } from "@luv-bank/validation";
import type { NudgeSuppressionRecord, NudgeSuppressionRepository } from "./nudge.types";

export function createMemoryNudgeSuppressionRepository(): NudgeSuppressionRepository {
  const byKey = new Map<string, NudgeSuppressionRecord>();

  function key(relationshipId: string, nudgeCode: NudgeCode): string {
    return `${relationshipId}:${nudgeCode}`;
  }

  return {
    async findActive(relationshipId, nudgeCode, now) {
      const row = byKey.get(key(relationshipId, nudgeCode));
      if (!row) return null;
      if (row.suppressedUntil.getTime() <= now.getTime()) return null;
      return { ...row };
    },

    async upsert(input) {
      const k = key(input.relationshipId, input.nudgeCode);
      const existing = byKey.get(k);
      const now = new Date();
      const record: NudgeSuppressionRecord = {
        id: existing?.id ?? randomUUID(),
        relationshipId: input.relationshipId,
        nudgeCode: input.nudgeCode,
        suppressedUntil: input.suppressedUntil,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      byKey.set(k, record);
      return { ...record };
    },

    async listByRelationshipIds(relationshipIds) {
      const idSet = new Set(relationshipIds);
      return [...byKey.values()]
        .filter((row) => idSet.has(row.relationshipId))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((row) => ({ ...row }));
    },

    async deleteAllForProfiles(relationshipIds) {
      const idSet = new Set(relationshipIds);
      let count = 0;
      for (const [k, row] of byKey) {
        if (idSet.has(row.relationshipId)) {
          byKey.delete(k);
          count += 1;
        }
      }
      return count;
    },
  };
}
