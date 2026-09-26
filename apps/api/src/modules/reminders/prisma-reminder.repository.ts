import type { PrismaClient } from "@luv-bank/database";
import type { ReminderPurposeCode, ReminderWeekday } from "@luv-bank/validation";
import type { ReminderPreferenceRecord, ReminderPreferenceRepository } from "./reminder.types";

function mapRow(row: {
  id: string;
  relationshipId: string;
  enabled: boolean;
  cadence: string;
  purposeCode: string;
  weekday: string;
  localHour: number;
  localMinute: number;
  timezone: string;
  nextDueAt: Date | null;
  snoozedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): ReminderPreferenceRecord {
  return {
    id: row.id,
    relationshipId: row.relationshipId,
    enabled: row.enabled,
    cadence: "WEEKLY",
    purposeCode: row.purposeCode as ReminderPurposeCode,
    weekday: row.weekday as ReminderWeekday,
    localHour: row.localHour,
    localMinute: row.localMinute,
    timezone: row.timezone,
    nextDueAt: row.nextDueAt,
    snoozedUntil: row.snoozedUntil,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createPrismaReminderPreferenceRepository(
  prisma: PrismaClient,
): ReminderPreferenceRepository {
  return {
    async findByRelationshipId(relationshipId) {
      const row = await prisma.reminderPreference.findUnique({ where: { relationshipId } });
      return row ? mapRow(row) : null;
    },

    async upsert(input) {
      const row = await prisma.reminderPreference.upsert({
        where: { relationshipId: input.relationshipId },
        create: {
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
        },
        update: {
          enabled: input.enabled,
          cadence: "WEEKLY",
          purposeCode: input.purposeCode,
          weekday: input.weekday,
          localHour: input.localHour,
          localMinute: input.localMinute,
          timezone: input.timezone,
          nextDueAt: input.nextDueAt,
          snoozedUntil: input.snoozedUntil,
        },
      });
      return mapRow(row);
    },

    async listByRelationshipIds(relationshipIds) {
      if (relationshipIds.length === 0) return [];
      const rows = await prisma.reminderPreference.findMany({
        where: { relationshipId: { in: relationshipIds } },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(mapRow);
    },

    async deleteAllForProfiles(relationshipIds) {
      if (relationshipIds.length === 0) return 0;
      const result = await prisma.reminderPreference.deleteMany({
        where: { relationshipId: { in: relationshipIds } },
      });
      return result.count;
    },
  };
}
