import { Temporal } from "@js-temporal/polyfill";
import { REMINDER_WEEKDAY_ISO, type ReminderWeekday } from "@luv-bank/validation";

export class InvalidTimezoneError extends Error {
  constructor(timezone: string) {
    super(`Invalid IANA timezone: ${timezone}`);
    this.name = "InvalidTimezoneError";
  }
}

export function assertValidIanaTimezone(timezone: string): void {
  try {
    Temporal.Now.zonedDateTimeISO(timezone);
  } catch {
    throw new InvalidTimezoneError(timezone);
  }
}

function toZonedDue(
  plainDate: Temporal.PlainDate,
  localHour: number,
  localMinute: number,
  timezone: string,
): Temporal.ZonedDateTime {
  const plain = plainDate.toPlainDateTime({
    hour: localHour,
    minute: localMinute,
    second: 0,
    millisecond: 0,
    microsecond: 0,
    nanosecond: 0,
  });
  // compatible: spring-forward → next valid instant; fall-back → earlier occurrence
  return plain.toZonedDateTime(timezone, { disambiguation: "compatible" });
}

export type WeeklyScheduleInput = {
  weekday: ReminderWeekday;
  localHour: number;
  localMinute: number;
  timezone: string;
};

/**
 * Server-owned next weekly due instant in UTC.
 * @param from Instant used as the reference "now".
 * @param mode `onOrAfter` keeps an occurrence exactly at `from`; `after` skips it.
 */
export function computeNextWeeklyDueAt(
  schedule: WeeklyScheduleInput,
  from: Date,
  mode: "onOrAfter" | "after" = "onOrAfter",
): Date {
  assertValidIanaTimezone(schedule.timezone);
  const fromInstant = Temporal.Instant.from(from.toISOString());
  const zonedNow = fromInstant.toZonedDateTimeISO(schedule.timezone);
  const targetDow = REMINDER_WEEKDAY_ISO[schedule.weekday];
  const delta = (targetDow - zonedNow.dayOfWeek + 7) % 7;
  let plainDate = zonedNow.toPlainDate().add({ days: delta });
  let zonedDue = toZonedDue(plainDate, schedule.localHour, schedule.localMinute, schedule.timezone);

  const compare = Temporal.Instant.compare(zonedDue.toInstant(), fromInstant);
  const needsAdvance = mode === "after" ? compare <= 0 : compare < 0;
  if (needsAdvance) {
    plainDate = plainDate.add({ days: 7 });
    zonedDue = toZonedDue(plainDate, schedule.localHour, schedule.localMinute, schedule.timezone);
  }

  return new Date(zonedDue.epochMilliseconds);
}

export function addSnoozeDuration(from: Date, duration: "1h" | "1d"): Date {
  const instant = Temporal.Instant.from(from.toISOString());
  const next = duration === "1h" ? instant.add({ hours: 1 }) : instant.add({ hours: 24 });
  return new Date(next.epochMilliseconds);
}
