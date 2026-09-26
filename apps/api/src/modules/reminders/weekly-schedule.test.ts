import { describe, expect, it } from "vitest";
import {
  computeNextWeeklyDueAt,
  addSnoozeDuration,
  assertValidIanaTimezone,
  InvalidTimezoneError,
} from "./weekly-schedule";

describe("weekly reminder scheduling", () => {
  it("rejects invalid IANA timezones", () => {
    expect(() => assertValidIanaTimezone("Not/AZone")).toThrow(InvalidTimezoneError);
    expect(() => assertValidIanaTimezone("Asia/Amman")).not.toThrow();
  });

  it("schedules the next Monday 18:00 Asia/Amman after a Sunday", () => {
    // Sunday 2026-08-02 12:00 UTC ≈ afternoon in Amman
    const from = new Date("2026-08-02T12:00:00.000Z");
    const next = computeNextWeeklyDueAt(
      {
        weekday: "MONDAY",
        localHour: 18,
        localMinute: 0,
        timezone: "Asia/Amman",
      },
      from,
      "onOrAfter",
    );
    // Monday 2026-08-03 18:00 Asia/Amman = 15:00 UTC (UTC+3)
    expect(next.toISOString()).toBe("2026-08-03T15:00:00.000Z");
  });

  it("rolls forward when today's local time has already passed", () => {
    // Monday 2026-08-03 20:00 Asia/Amman = 17:00 UTC
    const from = new Date("2026-08-03T17:00:00.000Z");
    const next = computeNextWeeklyDueAt(
      {
        weekday: "MONDAY",
        localHour: 18,
        localMinute: 0,
        timezone: "Asia/Amman",
      },
      from,
      "onOrAfter",
    );
    expect(next.toISOString()).toBe("2026-08-10T15:00:00.000Z");
  });

  it("uses after mode to skip the current due instant on dismiss", () => {
    const due = new Date("2026-08-03T15:00:00.000Z");
    const next = computeNextWeeklyDueAt(
      {
        weekday: "MONDAY",
        localHour: 18,
        localMinute: 0,
        timezone: "Asia/Amman",
      },
      due,
      "after",
    );
    expect(next.toISOString()).toBe("2026-08-10T15:00:00.000Z");
  });

  it("handles spring-forward nonexistent local times with compatible disambiguation", () => {
    // America/New_York spring forward 2026-03-08: 02:00 local does not exist.
    const from = new Date("2026-03-01T12:00:00.000Z");
    const next = computeNextWeeklyDueAt(
      {
        weekday: "SUNDAY",
        localHour: 2,
        localMinute: 30,
        timezone: "America/New_York",
      },
      from,
      "onOrAfter",
    );
    // compatible → next valid instant on that local calendar day after the gap
    expect(next.toISOString()).toBe("2026-03-08T07:30:00.000Z");
  });

  it("handles fall-back ambiguous local times with earlier occurrence", () => {
    // America/New_York fall back 2026-11-01: 01:30 occurs twice; compatible → earlier.
    const from = new Date("2026-10-25T12:00:00.000Z");
    const next = computeNextWeeklyDueAt(
      {
        weekday: "SUNDAY",
        localHour: 1,
        localMinute: 30,
        timezone: "America/New_York",
      },
      from,
      "onOrAfter",
    );
    expect(next.toISOString()).toBe("2026-11-01T05:30:00.000Z");
  });

  it("adds snooze durations without sleeping", () => {
    const from = new Date("2026-08-02T12:00:00.000Z");
    expect(addSnoozeDuration(from, "1h").toISOString()).toBe("2026-08-02T13:00:00.000Z");
    expect(addSnoozeDuration(from, "1d").toISOString()).toBe("2026-08-03T12:00:00.000Z");
  });
});
