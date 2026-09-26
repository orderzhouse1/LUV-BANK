import {
  DEFAULT_REMINDER_PREFERENCE,
  reminderPreferenceResponseSchema,
  snoozeReminderRequestSchema,
  upsertReminderPreferenceSchema,
  type ReminderPreferenceResponse,
  type ReminderPurposeCode,
  type ReminderWeekday,
} from "@luv-bank/validation";
import { AppError } from "../../errors/app-error";
import type { AuthRepository } from "../auth/auth.types";
import type { ReminderPreferenceRecord, ReminderPreferenceRepository } from "./reminder.types";
import {
  InvalidTimezoneError,
  addSnoozeDuration,
  assertValidIanaTimezone,
  computeNextWeeklyDueAt,
} from "./weekly-schedule";

function toResponse(
  record: {
    enabled: boolean;
    purposeCode: ReminderPurposeCode;
    weekday: ReminderWeekday;
    localHour: number;
    localMinute: number;
    timezone: string;
    nextDueAt: Date | null;
    snoozedUntil: Date | null;
  },
  now: Date,
): ReminderPreferenceResponse {
  const snoozedActive =
    record.snoozedUntil !== null && record.snoozedUntil.getTime() > now.getTime();
  const isDue =
    record.enabled &&
    record.nextDueAt !== null &&
    record.nextDueAt.getTime() <= now.getTime() &&
    !snoozedActive;

  return reminderPreferenceResponseSchema.parse({
    cadence: "WEEKLY",
    enabled: record.enabled,
    purposeCode: record.purposeCode,
    weekday: record.weekday,
    localHour: record.localHour,
    localMinute: record.localMinute,
    timezone: record.timezone,
    nextDueAt: record.nextDueAt ? record.nextDueAt.toISOString() : null,
    snoozedUntil: record.snoozedUntil ? record.snoozedUntil.toISOString() : null,
    deliveryMode: "IN_APP_CHECK",
    current: isDue
      ? {
          purposeCode: record.purposeCode,
          dueAt: record.nextDueAt!.toISOString(),
          availableActions: ["DISMISS_UNTIL_NEXT", "SNOOZE_1H", "SNOOZE_1D"],
        }
      : null,
  });
}

function virtualDisabled(): ReminderPreferenceResponse {
  return toResponse(
    {
      ...DEFAULT_REMINDER_PREFERENCE,
      nextDueAt: null,
      snoozedUntil: null,
    },
    new Date(0),
  );
}

export class ReminderService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly reminderRepo: ReminderPreferenceRepository,
  ) {}

  private async requireActiveProfileId(userId: string): Promise<string> {
    const profile = await this.authRepo.findActiveProfileForUser(userId);
    if (!profile || profile.status !== "ACTIVE" || profile.archivedAt) {
      throw new AppError(
        400,
        "PROFILE_REQUIRED",
        "An active relationship profile is required before managing reminders.",
      );
    }
    return profile.id;
  }

  async getPreference(userId: string, now = new Date()): Promise<ReminderPreferenceResponse> {
    const profileId = await this.requireActiveProfileId(userId);
    const row = await this.reminderRepo.findByRelationshipId(profileId);
    if (!row) {
      return virtualDisabled();
    }
    return toResponse(row, now);
  }

  async upsertPreference(
    userId: string,
    rawBody: unknown,
    now = new Date(),
  ): Promise<ReminderPreferenceResponse> {
    const body = upsertReminderPreferenceSchema.parse(rawBody);
    const profileId = await this.requireActiveProfileId(userId);

    try {
      assertValidIanaTimezone(body.timezone);
    } catch (error) {
      if (error instanceof InvalidTimezoneError) {
        throw new AppError(400, "VALIDATION_ERROR", "Timezone must be a valid IANA identifier.");
      }
      throw error;
    }

    let nextDueAt: Date | null = null;
    if (body.enabled) {
      nextDueAt = computeNextWeeklyDueAt(
        {
          weekday: body.weekday,
          localHour: body.localHour,
          localMinute: body.localMinute,
          timezone: body.timezone,
        },
        now,
        "onOrAfter",
      );
    }

    const saved = await this.reminderRepo.upsert({
      relationshipId: profileId,
      enabled: body.enabled,
      purposeCode: body.purposeCode,
      weekday: body.weekday,
      localHour: body.localHour,
      localMinute: body.localMinute,
      timezone: body.timezone,
      nextDueAt,
      snoozedUntil: null,
    });

    return toResponse(saved, now);
  }

  private async requireStoredPreference(
    userId: string,
  ): Promise<{ profileId: string; row: ReminderPreferenceRecord }> {
    const profileId = await this.requireActiveProfileId(userId);
    const row = await this.reminderRepo.findByRelationshipId(profileId);
    if (!row || !row.enabled || !row.nextDueAt) {
      throw new AppError(400, "REMINDER_NOT_DUE", "There is no due reminder to act on.");
    }
    return { profileId, row };
  }

  async dismiss(userId: string, now = new Date()): Promise<ReminderPreferenceResponse> {
    const { row } = await this.requireStoredPreference(userId);
    const snoozedActive = row.snoozedUntil !== null && row.snoozedUntil.getTime() > now.getTime();
    if (row.nextDueAt!.getTime() > now.getTime() || snoozedActive) {
      throw new AppError(400, "REMINDER_NOT_DUE", "There is no due reminder to act on.");
    }

    const nextDueAt = computeNextWeeklyDueAt(
      {
        weekday: row.weekday,
        localHour: row.localHour,
        localMinute: row.localMinute,
        timezone: row.timezone,
      },
      now,
      "after",
    );

    const saved = await this.reminderRepo.upsert({
      relationshipId: row.relationshipId,
      enabled: row.enabled,
      purposeCode: row.purposeCode,
      weekday: row.weekday,
      localHour: row.localHour,
      localMinute: row.localMinute,
      timezone: row.timezone,
      nextDueAt,
      snoozedUntil: null,
    });

    return toResponse(saved, now);
  }

  async snooze(
    userId: string,
    rawBody: unknown,
    now = new Date(),
  ): Promise<ReminderPreferenceResponse> {
    const body = snoozeReminderRequestSchema.parse(rawBody);
    const { row } = await this.requireStoredPreference(userId);
    const snoozedActive = row.snoozedUntil !== null && row.snoozedUntil.getTime() > now.getTime();
    if (row.nextDueAt!.getTime() > now.getTime() || snoozedActive) {
      throw new AppError(400, "REMINDER_NOT_DUE", "There is no due reminder to act on.");
    }

    const snoozedUntil = addSnoozeDuration(now, body.duration);
    const saved = await this.reminderRepo.upsert({
      relationshipId: row.relationshipId,
      enabled: row.enabled,
      purposeCode: row.purposeCode,
      weekday: row.weekday,
      localHour: row.localHour,
      localMinute: row.localMinute,
      timezone: row.timezone,
      nextDueAt: row.nextDueAt,
      snoozedUntil,
    });

    return toResponse(saved, now);
  }
}
