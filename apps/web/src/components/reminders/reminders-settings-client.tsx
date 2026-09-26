"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ReminderPreferenceResponse,
  ReminderPurposeCode,
  ReminderWeekday,
  UpsertReminderPreferenceRequest,
} from "@luv-bank/validation";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fetchReminderPreference, upsertReminderPreference } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const PURPOSES: ReminderPurposeCode[] = [
  "PRIVATE_WEEKLY_CHECK_IN",
  "RECORD_WHEN_READY",
  "REVIEW_RECENT_MOMENTS",
];

const WEEKDAYS: ReminderWeekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const BASE_TIMEZONES = [
  "Asia/Amman",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Beirut",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatNextDue(iso: string | null, locale: AppLocale, timezone: string): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(iso));
}

export function RemindersSettingsClient({
  locale,
  dictionary,
}: {
  locale: AppLocale;
  dictionary: Dictionary;
}) {
  const [data, setData] = useState<ReminderPreferenceResponse | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [purposeCode, setPurposeCode] = useState<ReminderPurposeCode>("PRIVATE_WEEKLY_CHECK_IN");
  const [weekday, setWeekday] = useState<ReminderWeekday>("MONDAY");
  const [localHour, setLocalHour] = useState(18);
  const [localMinute, setLocalMinute] = useState(0);
  const [timezone, setTimezone] = useState("Asia/Amman");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const timezones = useMemo(() => {
    const device =
      typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
    const list = [...BASE_TIMEZONES];
    if (device && !list.includes(device)) {
      list.unshift(device);
    }
    return list;
  }, []);

  const applyPreference = useCallback((pref: ReminderPreferenceResponse) => {
    setData(pref);
    setEnabled(pref.enabled);
    setPurposeCode(pref.purposeCode);
    setWeekday(pref.weekday);
    setLocalHour(pref.localHour);
    setLocalMinute(pref.localMinute);
    setTimezone(pref.timezone);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      applyPreference(await fetchReminderPreference());
    } catch {
      setError(dictionary.app.remindersError);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [applyPreference, dictionary.app.remindersError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const body: UpsertReminderPreferenceRequest = {
      enabled,
      purposeCode,
      weekday,
      localHour,
      localMinute,
      timezone,
      cadence: "WEEKLY",
    };
    try {
      applyPreference(await upsertReminderPreference(body));
      setMessage(dictionary.app.remindersSaved);
    } catch {
      setError(dictionary.app.remindersError);
    } finally {
      setSaving(false);
    }
  }

  function useDeviceTimezone() {
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (device) setTimezone(device);
  }

  const nextDueLabel = formatNextDue(data?.nextDueAt ?? null, locale, timezone);

  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-foreground">
        {dictionary.app.remindersDeliveryNote}
      </p>
      <p className="text-sm text-muted">{dictionary.app.remindersIndependenceNote}</p>
      <p className="text-xs text-muted">{dictionary.app.remindersCadenceNote}</p>

      {loading ? <p className="text-sm text-muted">{dictionary.app.remindersLoading}</p> : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}

      {!loading ? (
        <form
          className="space-y-5 rounded-2xl border border-border bg-surface/90 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave();
          }}
        >
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={enabled}
              onCheckedChange={(value) => setEnabled(value === true)}
              aria-label={dictionary.app.remindersEnabledLabel}
            />
            <span>{dictionary.app.remindersEnabledLabel}</span>
          </label>

          <div className="space-y-2">
            <Label htmlFor="reminder-purpose">{dictionary.app.remindersPurposeLabel}</Label>
            <select
              id="reminder-purpose"
              className="flex h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
              value={purposeCode}
              onChange={(event) => setPurposeCode(event.target.value as ReminderPurposeCode)}
            >
              {PURPOSES.map((code) => (
                <option key={code} value={code}>
                  {dictionary.reminderPurposes[code].title}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted">{dictionary.reminderPurposes[purposeCode].body}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reminder-weekday">{dictionary.app.remindersWeekdayLabel}</Label>
              <select
                id="reminder-weekday"
                className="flex h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
                value={weekday}
                onChange={(event) => setWeekday(event.target.value as ReminderWeekday)}
              >
                {WEEKDAYS.map((day) => (
                  <option key={day} value={day}>
                    {dictionary.weekdays[day]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-time">{dictionary.app.remindersTimeLabel}</Label>
              <input
                id="reminder-time"
                type="time"
                className="flex h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
                value={`${pad2(localHour)}:${pad2(localMinute)}`}
                onChange={(event) => {
                  const [h, m] = event.target.value.split(":").map((part) => Number(part));
                  if (Number.isFinite(h) && Number.isFinite(m)) {
                    setLocalHour(h!);
                    setLocalMinute(m!);
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder-timezone">{dictionary.app.remindersTimezoneLabel}</Label>
            <select
              id="reminder-timezone"
              className="flex h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            >
              {timezones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
              {!timezones.includes(timezone) ? <option value={timezone}>{timezone}</option> : null}
            </select>
            <Button type="button" variant="ghost" size="sm" onClick={useDeviceTimezone}>
              {dictionary.app.remindersTimezoneSuggest}
            </Button>
          </div>

          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">{dictionary.app.remindersNextDueLabel}</p>
            <p className="text-muted">
              {enabled && nextDueLabel ? nextDueLabel : dictionary.app.remindersDisabledNext}
            </p>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? dictionary.app.remindersSaving : dictionary.app.remindersSave}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
