import { randomUUID } from "node:crypto";
import type { ReminderPreferenceRecord, ReminderPreferenceRepository } from "./reminder.types";

export function createMemoryReminderPreferenceRepository(): ReminderPreferenceRepository {
  const byRelationship = new Map<string, ReminderPreferenceRecord>();

  return {
    async findByRelationshipId(relationshipId) {
      const row = byRelationship.get(relationshipId);
      return row ? { ...row } : null;
    },

    async upsert(input) {
      const existing = byRelationship.get(input.relationshipId);
      const now = new Date();
      const record: ReminderPreferenceRecord = {
        id: existing?.id ?? randomUUID(),
        relationshipId: input.relationshipId,
        enabled: input.enabled,
        cadence: "WEEKLY",
        purposeCode: input.purposeCode,
        weekday: input.weekday,
        localHour: input.localHour,
        localMinute: input.localMinute,
        timezone: input.timezone,
        nextDueAt: input.nextDueAt,
        snoozedUntil: input.snoozedUntil,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      byRelationship.set(input.relationshipId, record);
      return { ...record };
    },

    async listByRelationshipIds(relationshipIds) {
      const idSet = new Set(relationshipIds);
      return [...byRelationship.values()]
        .filter((row) => idSet.has(row.relationshipId))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((row) => ({ ...row }));
    },

    async deleteAllForProfiles(relationshipIds) {
      const idSet = new Set(relationshipIds);
      let count = 0;
      for (const [id, row] of byRelationship) {
        if (idSet.has(row.relationshipId)) {
          byRelationship.delete(id);
          count += 1;
        }
      }
      return count;
    },
  };
}
