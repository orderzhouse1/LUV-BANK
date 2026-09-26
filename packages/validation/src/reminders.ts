import { z } from "zod";

export const REMINDER_CADENCE_WEEKLY = "WEEKLY" as const;
export const reminderCadenceSchema = z.literal(REMINDER_CADENCE_WEEKLY);
export type ReminderCadence = z.infer<typeof reminderCadenceSchema>;

export const reminderPurposeCodeSchema = z.enum([
  "PRIVATE_WEEKLY_CHECK_IN",
  "RECORD_WHEN_READY",
  "REVIEW_RECENT_MOMENTS",
]);
export type ReminderPurposeCode = z.infer<typeof reminderPurposeCodeSchema>;

export const reminderWeekdaySchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);
export type ReminderWeekday = z.infer<typeof reminderWeekdaySchema>;

export const reminderSnoozeDurationSchema = z.enum(["1h", "1d"]);
export type ReminderSnoozeDuration = z.infer<typeof reminderSnoozeDurationSchema>;

export const reminderDeliveryModeSchema = z.literal("IN_APP_CHECK");
export type ReminderDeliveryMode = z.infer<typeof reminderDeliveryModeSchema>;

/** ISO weekday numbers used by Temporal (Monday = 1 … Sunday = 7). */
export const REMINDER_WEEKDAY_ISO: Record<ReminderWeekday, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
};

export const upsertReminderPreferenceSchema = z.object({
  enabled: z.boolean(),
  purposeCode: reminderPurposeCodeSchema,
  weekday: reminderWeekdaySchema,
  localHour: z.number().int().min(0).max(23),
  localMinute: z.number().int().min(0).max(59),
  timezone: z.string().min(1).max(64),
  cadence: reminderCadenceSchema.default(REMINDER_CADENCE_WEEKLY),
});

export type UpsertReminderPreferenceRequest = z.infer<typeof upsertReminderPreferenceSchema>;

export const snoozeReminderRequestSchema = z.object({
  duration: reminderSnoozeDurationSchema,
});

export type SnoozeReminderRequest = z.infer<typeof snoozeReminderRequestSchema>;

export const reminderCurrentPayloadSchema = z.object({
  purposeCode: reminderPurposeCodeSchema,
  dueAt: z.string().datetime(),
  availableActions: z.array(z.enum(["DISMISS_UNTIL_NEXT", "SNOOZE_1H", "SNOOZE_1D"])),
});

export type ReminderCurrentPayload = z.infer<typeof reminderCurrentPayloadSchema>;

export const reminderPreferenceResponseSchema = z.object({
  cadence: reminderCadenceSchema,
  enabled: z.boolean(),
  purposeCode: reminderPurposeCodeSchema,
  weekday: reminderWeekdaySchema,
  localHour: z.number().int().min(0).max(23),
  localMinute: z.number().int().min(0).max(59),
  timezone: z.string().min(1),
  nextDueAt: z.string().datetime().nullable(),
  snoozedUntil: z.string().datetime().nullable(),
  deliveryMode: reminderDeliveryModeSchema,
  current: reminderCurrentPayloadSchema.nullable(),
});

export type ReminderPreferenceResponse = z.infer<typeof reminderPreferenceResponseSchema>;

/** Defaults returned when the user has never saved a preference (disabled, no row). */
export const DEFAULT_REMINDER_PREFERENCE = {
  cadence: REMINDER_CADENCE_WEEKLY,
  enabled: false,
  purposeCode: "PRIVATE_WEEKLY_CHECK_IN" as const,
  weekday: "MONDAY" as const,
  localHour: 18,
  localMinute: 0,
  timezone: "Asia/Amman",
  deliveryMode: "IN_APP_CHECK" as const,
};
