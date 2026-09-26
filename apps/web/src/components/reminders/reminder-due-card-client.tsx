"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ReminderPreferenceResponse, ReminderPurposeCode } from "@luv-bank/validation";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { dismissReminder, fetchReminderPreference, snoozeReminder } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

function actionHref(locale: AppLocale, purpose: ReminderPurposeCode): string | null {
  switch (purpose) {
    case "RECORD_WHEN_READY":
      return `/${locale}/app/log`;
    case "REVIEW_RECENT_MOMENTS":
      return `/${locale}/app/history`;
    default:
      return null;
  }
}

export function ReminderDueCardClient({
  locale,
  dictionary,
}: {
  locale: AppLocale;
  dictionary: Dictionary;
}) {
  const [data, setData] = useState<ReminderPreferenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchReminderPreference());
    } catch {
      setError(dictionary.app.remindersError);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dictionary.app.remindersError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDismiss() {
    setActing(true);
    setError(null);
    try {
      setData(await dismissReminder());
    } catch {
      setError(dictionary.app.remindersError);
    } finally {
      setActing(false);
    }
  }

  async function onSnooze(duration: "1h" | "1d") {
    setActing(true);
    setError(null);
    try {
      setData(await snoozeReminder(duration));
    } catch {
      setError(dictionary.app.remindersError);
    } finally {
      setActing(false);
    }
  }

  if (loading || error || !data?.current) {
    if (error) {
      return (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      );
    }
    return null;
  }

  const purpose = data.current.purposeCode;
  const href = actionHref(locale, purpose);
  const copy = dictionary.reminderPurposes[purpose];

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface/90 p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-brand-strong">
          {dictionary.app.remindersDueTitle}
        </h2>
        <p className="text-xs text-muted">{dictionary.app.remindersDeliveryNote}</p>
      </div>
      <div className="space-y-2">
        <h3 className="text-base font-medium text-foreground">{copy.title}</h3>
        <p className="text-sm leading-relaxed text-muted">{copy.body}</p>
      </div>
      {href ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href}>{copy.title}</Link>
        </Button>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={acting}
          onClick={() => void onDismiss()}
        >
          {acting ? dictionary.app.remindersActing : dictionary.app.remindersDismiss}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={acting}
          onClick={() => void onSnooze("1h")}
        >
          {dictionary.app.remindersSnooze1h}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={acting}
          onClick={() => void onSnooze("1d")}
        >
          {dictionary.app.remindersSnooze1d}
        </Button>
      </div>
    </section>
  );
}
