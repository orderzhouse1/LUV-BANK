"use client";

import { useCallback, useEffect, useState } from "react";
import type { InsightSummaryResponse, InsightWindow, TrendBucket } from "@luv-bank/validation";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fetchInsightSummary } from "@/lib/api-client";
import { formatInsightObservation } from "@/lib/insights";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NudgeCardClient } from "@/components/nudges/nudge-card-client";
import { cn } from "@/lib/utils";

const WINDOWS: InsightWindow[] = ["7d", "30d", "90d"];

function windowLabel(dictionary: Dictionary, window: InsightWindow): string {
  switch (window) {
    case "7d":
      return dictionary.app.insightsWindow7d;
    case "30d":
      return dictionary.app.insightsWindow30d;
    case "90d":
      return dictionary.app.insightsWindow90d;
  }
}

function formatSigned(value: number, locale: AppLocale): string {
  const abs = new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return abs;
}

function formatBucketRange(bucket: TrendBucket, locale: AppLocale): string {
  const start = new Date(bucket.startsAt);
  const end = new Date(bucket.endsAt);
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    month: "short",
    day: "numeric",
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export function InsightsClient({
  locale,
  dictionary,
}: {
  locale: AppLocale;
  dictionary: Dictionary;
}) {
  const [window, setWindow] = useState<InsightWindow>("30d");
  const [data, setData] = useState<InsightSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (selected: InsightWindow) => {
      setLoading(true);
      setError(null);
      try {
        setData(await fetchInsightSummary(selected));
      } catch {
        setError(dictionary.app.insightsError);
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [dictionary.app.insightsError],
  );

  useEffect(() => {
    void load(window);
  }, [load, window]);

  const maxAbs = data
    ? Math.max(
        1,
        ...data.buckets.map((b) =>
          Math.max(b.positiveContribution, b.difficultContribution, Math.abs(b.netBalance)),
        ),
      )
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Label htmlFor="insight-window">{dictionary.app.insightsWindowLabel}</Label>
          <select
            id="insight-window"
            className="flex h-11 min-w-[12rem] rounded-lg border border-border bg-surface px-3 text-sm"
            value={window}
            onChange={(event) => setWindow(event.target.value as InsightWindow)}
          >
            {WINDOWS.map((key) => (
              <option key={key} value={key}>
                {windowLabel(dictionary, key)}
              </option>
            ))}
          </select>
        </div>
        {data ? (
          <p className="text-xs text-muted">
            {dictionary.app.insightsRulesetLabel}: {data.insightRuleset}
          </p>
        ) : null}
      </div>

      <NudgeCardClient locale={locale} dictionary={dictionary} window={window} />

      {loading ? (
        <p className="text-sm text-muted">{dictionary.app.insightsLoading}</p>
      ) : error ? (
        <div className="space-y-3">
          <p className="text-sm text-difficult" role="alert">
            {error}
          </p>
          <Button type="button" variant="outline" onClick={() => void load(window)}>
            {dictionary.app.retry}
          </Button>
        </div>
      ) : data && data.currentPeriod.totalMoments === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-muted">
          {dictionary.app.insightsEmpty}
        </p>
      ) : data ? (
        <>
          <section className="space-y-3 rounded-2xl border border-border bg-surface/90 p-5">
            <h2 className="text-lg font-semibold text-brand-strong">
              {dictionary.app.insightsTrendTitle}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <p className="text-sm">
                <span className="text-muted">{dictionary.app.balanceNetLabel}: </span>
                <span className="font-medium">
                  {formatSigned(data.currentPeriod.netBalance, locale)}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-muted">{dictionary.app.insightsChangeLabel}: </span>
                <span className="font-medium">
                  {formatSigned(data.changeFromPrevious.netBalance, locale)}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-muted">{dictionary.app.insightsPreviousLabel}: </span>
                <span className="font-medium">
                  {formatSigned(data.previousPeriod.netBalance, locale)}
                </span>
              </p>
            </div>
            <ul className="space-y-3" aria-label={dictionary.app.insightsTrendTitle}>
              {data.buckets.map((bucket) => (
                <li key={bucket.startsAt} className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                    <span>{formatBucketRange(bucket, locale)}</span>
                    <span>
                      {dictionary.app.insightsBucketNet} {formatSigned(bucket.netBalance, locale)}
                    </span>
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-full bg-surface-muted">
                    <span
                      className="bg-positive/70"
                      style={{
                        width: `${(bucket.positiveContribution / maxAbs) * 50}%`,
                      }}
                      title={dictionary.app.insightsBucketPositive}
                    />
                    <span
                      className={cn("ms-auto bg-difficult/70")}
                      style={{
                        width: `${(bucket.difficultContribution / maxAbs) * 50}%`,
                      }}
                      title={dictionary.app.insightsBucketDifficult}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-surface/90 p-5">
            <h2 className="text-lg font-semibold text-brand-strong">
              {dictionary.app.insightsObservationsTitle}
            </h2>
            <ul className="space-y-2">
              {data.observations.map((observation) => (
                <li
                  key={`${observation.code}-${JSON.stringify(observation.parameters)}`}
                  className="rounded-xl border border-border bg-background/50 px-4 py-3 text-sm leading-relaxed text-foreground"
                >
                  {formatInsightObservation(observation, dictionary)}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-surface/90 p-5">
            <h2 className="text-lg font-semibold text-brand-strong">
              {dictionary.app.insightsCategoriesTitle}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-positive">
                  {dictionary.app.insightsPositiveCategories}
                </h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {data.categoryFrequency.positive.length === 0 ? (
                    <li className="text-muted">—</li>
                  ) : (
                    data.categoryFrequency.positive.map((item) => (
                      <li key={item.categoryCode}>
                        {dictionary.categories[item.categoryCode].label}: {item.count}
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-difficult">
                  {dictionary.app.insightsDifficultCategories}
                </h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {data.categoryFrequency.difficult.length === 0 ? (
                    <li className="text-muted">—</li>
                  ) : (
                    data.categoryFrequency.difficult.map((item) => (
                      <li key={item.categoryCode}>
                        {dictionary.categories[item.categoryCode].label}: {item.count}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </section>

          <p className="text-xs leading-relaxed text-muted">{dictionary.app.insightsDisclaimer}</p>
        </>
      ) : null}
    </div>
  );
}
