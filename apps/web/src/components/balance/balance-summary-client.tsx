"use client";

import { useCallback, useEffect, useState } from "react";
import type { BalanceSummaryResponse, BalanceWindow } from "@luv-bank/validation";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { fetchBalanceSummary } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const WINDOWS: BalanceWindow[] = ["7d", "30d", "90d", "all"];

function formatSigned(value: number, locale: AppLocale): string {
  const abs = new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return abs;
}

function windowLabel(dictionary: Dictionary, window: BalanceWindow): string {
  switch (window) {
    case "7d":
      return dictionary.app.balanceWindow7d;
    case "30d":
      return dictionary.app.balanceWindow30d;
    case "90d":
      return dictionary.app.balanceWindow90d;
    case "all":
      return dictionary.app.balanceWindowAll;
  }
}

export function BalanceSummaryClient({
  locale,
  dictionary,
}: {
  locale: AppLocale;
  dictionary: Dictionary;
}) {
  const [window, setWindow] = useState<BalanceWindow>("30d");
  const [data, setData] = useState<BalanceSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (selected: BalanceWindow) => {
      setLoading(true);
      setError(null);
      try {
        const summary = await fetchBalanceSummary(selected);
        setData(summary);
      } catch {
        setError(dictionary.app.balanceError);
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [dictionary.app.balanceError],
  );

  useEffect(() => {
    void load(window);
  }, [load, window]);

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface/90 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-strong">{dictionary.app.balanceTitle}</h2>
          <p className="mt-1 text-sm text-muted">{dictionary.app.balanceSelectedPeriodLabel}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="balance-window" className="sr-only">
            {dictionary.app.balanceWindowLabel}
          </Label>
          <select
            id="balance-window"
            className="flex h-11 min-w-[11rem] rounded-lg border border-border bg-surface px-3 text-sm"
            value={window}
            onChange={(event) => setWindow(event.target.value as BalanceWindow)}
          >
            {WINDOWS.map((key) => (
              <option key={key} value={key}>
                {windowLabel(dictionary, key)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted">{dictionary.app.balanceLoading}</p>
      ) : error ? (
        <div className="space-y-3">
          <p className="text-sm text-difficult" role="alert">
            {error}
          </p>
          <Button type="button" variant="outline" onClick={() => void load(window)}>
            {dictionary.app.retry}
          </Button>
        </div>
      ) : data && data.lifetime.totalMoments === 0 ? (
        <p className="text-sm text-muted">{dictionary.app.balanceEmpty}</p>
      ) : data ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label={dictionary.app.balanceNetLabel}
              value={formatSigned(data.currentPeriod.netBalance, locale)}
              emphasize
            />
            <Stat
              label={dictionary.app.balancePositiveLabel}
              value={formatSigned(data.currentPeriod.positiveContribution, locale)}
              tone="positive"
            />
            <Stat
              label={dictionary.app.balanceDifficultLabel}
              value={new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(
                data.currentPeriod.difficultContribution,
              )}
              tone="difficult"
            />
            <Stat
              label={dictionary.app.balanceTotalMomentsLabel}
              value={new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(
                data.currentPeriod.totalMoments,
              )}
            />
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted">{dictionary.app.balanceLifetimeLabel}: </span>
              <span className="font-medium text-foreground">
                {formatSigned(data.lifetime.netBalance, locale)}
              </span>
            </p>
            {data.changeFromPrevious ? (
              <p>
                <span className="text-muted">{dictionary.app.balanceChangeLabel}: </span>
                <span className="font-medium text-foreground">
                  {formatSigned(data.changeFromPrevious.netBalance, locale)}
                </span>
              </p>
            ) : null}
            {data.previousPeriod ? (
              <p>
                <span className="text-muted">{dictionary.app.balancePreviousPeriodLabel}: </span>
                <span className="font-medium text-foreground">
                  {formatSigned(data.previousPeriod.netBalance, locale)}
                </span>
              </p>
            ) : null}
            <p>
              <span className="text-muted">{dictionary.app.balanceScoringVersionLabel}: </span>
              <span className="font-medium text-foreground">{data.scoringVersion}</span>
            </p>
          </div>

          <details className="rounded-xl border border-border bg-background/60 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-brand-strong">
              {dictionary.app.balanceHowTitle}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {dictionary.app.balanceHowBody}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {dictionary.app.balanceDisclaimer}
            </p>
          </details>
        </div>
      ) : null}
    </section>
  );
}

function Stat({
  label,
  value,
  emphasize,
  tone,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  tone?: "positive" | "difficult";
}) {
  return (
    <div className="rounded-xl border border-border bg-background/50 px-4 py-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight",
          emphasize && "text-brand-strong",
          tone === "positive" && "text-positive",
          tone === "difficult" && "text-difficult",
          !emphasize && !tone && "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
