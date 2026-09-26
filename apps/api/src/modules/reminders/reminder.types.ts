import type { ReminderPurposeCode, ReminderWeekday } from "@luv-bank/validation";

export type ReminderPreferenceRecord = {
  id: string;
  relationshipId: string;
  enabled: boolean;
  cadence: "WEEKLY";
  purposeCode: ReminderPurposeCode;
  weekday: ReminderWeekday;
  localHour: number;
  localMinute: number;
  timezone: string;
  nextDueAt: Date | null;
  snoozedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ReminderPreferenceWrite = {
  relationshipId: string;
  enabled: boolean;
  purposeCode: ReminderPurposeCode;
  weekday: ReminderWeekday;
  localHour: number;
  localMinute: number;
  timezone: string;
  nextDueAt: Date | null;
  snoozedUntil: Date | null;
};

export type ReminderPreferenceRepository = {
  findByRelationshipId(relationshipId: string): Promise<ReminderPreferenceRecord | null>;
  upsert(input: ReminderPreferenceWrite): Promise<ReminderPreferenceRecord>;
  listByRelationshipIds(relationshipIds: string[]): Promise<ReminderPreferenceRecord[]>;
  deleteAllForProfiles(relationshipIds: string[]): Promise<number>;
};
