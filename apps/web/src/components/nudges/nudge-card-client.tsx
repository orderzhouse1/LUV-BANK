"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type {
  NudgeActionCode,
  NudgeCurrentResponse,
  NudgeSuppressionDuration,
  NudgeWindow,
} from "@luv-bank/validation";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fetchNudgeCurrent, suppressNudge } from "@/lib/api-client";
import { formatInsightObservation } from "@/lib/insights";
import { Button } from "@/components/ui/button";

function actionHref(locale: AppLocale, code: NudgeActionCode): string | null {
  switch (code) {
    case "LOG_ONE_PRIVATE_MOMENT":
    case "WRITE_PRIVATE_REFLECTION":
      return `/${locale}/app/log`;
    case "REVIEW_RECENT_MOMENTS":
      return `/${locale}/app/history`;
    default:
      return null;
  }
}

function suppressLabel(dictionary: Dictionary, duration: NudgeSuppressionDuration): string {
  switch (duration) {
    case "1d":
      return dictionary.app.nudgeSuppress1d;
    case "7d":
      return dictionary.app.nudgeSuppress7d;
    case "30d":
      return dictionary.app.nudgeSuppress30d;
  }
}

export function NudgeCardClient({
  locale,
  dictionary,
  window = "30d",
}: {
  locale: AppLocale;
  dictionary: Dictionary;
  window?: NudgeWindow;
}) {
  const [data, setData] = useState<NudgeCurrentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suppressing, setSuppressing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(
    async (selected: NudgeWindow) => {
      setLoading(true);
      setError(null);
      try {
        setData(await fetchNudgeCurrent(selected));
      } catch {
        setError(dictionary.app.nudgeError);
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [dictionary.app.nudgeError],
  );

  useEffect(() => {
    void load(window);
  }, [load, window]);

  async function onSuppress(duration: NudgeSuppressionDuration) {
    if (!data?.nudge) return;
    setSuppressing(true);
    setMessage(null);
    try {
      await suppressNudge({ nudgeCode: data.nudge.code, duration });
      setMessage(dictionary.app.nudgeSuppressSuccess);
      setData({ ...data, nudge: null });
    } catch {
      setError(dictionary.app.nudgeError);
    } finally {
      setSuppressing(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface/90 p-5">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-brand-strong">{dictionary.app.nudgeTitle}</h2>
          <span className="text-xs text-muted">{dictionary.app.nudgeOptionalBadge}</span>
        </div>
        <p className="text-sm leading-relaxed text-muted">{dictionary.app.nudgeBody}</p>
      </div>

      {loading ? <p className="text-sm text-muted">{dictionary.app.nudgeLoading}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}

      {!loading && !error && data && !data.nudge ? (
        <p className="text-sm text-muted">{dictionary.app.nudgeEmpty}</p>
      ) : null}

      {!loading && data?.nudge ? (
        <div className="space-y-4">
          <p className="text-base leading-relaxed text-foreground">
            {dictionary.nudges[data.nudge.code]}
          </p>

          {data.nudge.rationaleObservationCodes.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {dictionary.app.nudgeRationaleLabel}
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted">
                {data.nudge.rationaleObservationCodes.map((code) => (
                  <li key={code}>
                    {formatInsightObservation({ code, parameters: {} }, dictionary)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              {dictionary.app.nudgeActionsLabel}
            </p>
            <ul className="flex flex-wrap gap-2">
              {data.nudge.actionCodes.map((code) => {
                const href = actionHref(locale, code);
                const label = dictionary.actions[code];
                return (
                  <li key={code}>
                    {href ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={href}>{label}</Link>
                      </Button>
                    ) : (
                      <span className="inline-flex rounded-lg border border-border px-3 py-1.5 text-sm text-foreground">
                        {label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-sm text-muted">{dictionary.app.nudgeSuppressLabel}</p>
            <div className="flex flex-wrap gap-2">
              {data.nudge.availableSuppressions.map((duration) => (
                <Button
                  key={duration}
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={suppressing}
                  onClick={() => void onSuppress(duration)}
                >
                  {suppressing
                    ? dictionary.app.nudgeSuppressing
                    : suppressLabel(dictionary, duration)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-muted">{dictionary.app.nudgeDisclaimer}</p>
    </section>
  );
}
