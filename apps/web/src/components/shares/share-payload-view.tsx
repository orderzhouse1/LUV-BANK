"use client";

import type { PrivateShareSnapshotPayload } from "@luv-bank/validation";
import type { AppLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

function formatSigned(value: number, locale: AppLocale): string {
  const abs = new Intl.NumberFormat(locale === "ar" ? "ar" : "en").format(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return abs;
}

function windowLabel(dictionary: Dictionary, window: "7d" | "30d" | "90d"): string {
  switch (window) {
    case "7d":
      return dictionary.app.shareWindow7d;
    case "30d":
      return dictionary.app.shareWindow30d;
    case "90d":
      return dictionary.app.shareWindow90d;
  }
}

export function SharePayloadView({
  payload,
  locale,
  dictionary,
}: {
  payload: PrivateShareSnapshotPayload;
  locale: AppLocale;
  dictionary: Dictionary;
}) {
  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted">
        {dictionary.app.shareWindowLabel}: {windowLabel(dictionary, payload.selectedWindow)}
      </p>
      <p className="text-muted">{dictionary.shareScopes[payload.scope].label}</p>

      {payload.scope === "POSITIVE_ONLY" ? (
        <ul className="space-y-1">
          <li>
            {dictionary.app.balancePositiveLabel}:{" "}
            {formatSigned(payload.period.positiveContribution, locale)}
          </li>
          <li>
            {dictionary.app.kindPositive}: {payload.period.positiveMomentCount}
          </li>
        </ul>
      ) : null}

      {payload.scope === "SELECTED_PERIOD_SUMMARY" ? (
        <ul className="space-y-1">
          <li>
            {dictionary.app.balancePositiveLabel}:{" "}
            {formatSigned(payload.period.positiveContribution, locale)}
          </li>
          <li>
            {dictionary.app.balanceDifficultLabel}:{" "}
            {formatSigned(-payload.period.difficultContribution, locale)}
          </li>
          <li>
            {dictionary.app.balanceNetLabel}: {formatSigned(payload.period.netBalance, locale)}
          </li>
          <li>
            {dictionary.app.balanceTotalMomentsLabel}: {payload.period.totalMoments}
          </li>
        </ul>
      ) : null}

      {payload.scope === "EXTENDED_BALANCE_SUMMARY" ? (
        <div className="space-y-3">
          <p className="text-xs text-muted">{dictionary.app.shareExtendedNote}</p>
          <ul className="space-y-1">
            <li>
              {dictionary.app.balanceLifetimeLabel}:{" "}
              {formatSigned(payload.lifetime.netBalance, locale)}
            </li>
            <li>
              {dictionary.app.balanceNetLabel}:{" "}
              {formatSigned(payload.currentPeriod.netBalance, locale)}
            </li>
            <li>
              {dictionary.app.insightsChangeLabel}:{" "}
              {formatSigned(payload.changeFromPrevious.netBalance, locale)}
            </li>
            <li>
              {dictionary.app.insightsTrendTitle}: {payload.buckets.length}
            </li>
          </ul>
        </div>
      ) : null}

      {"positiveCategoryCounts" in payload && payload.positiveCategoryCounts.length > 0 ? (
        <div>
          <p className="font-medium">{dictionary.app.insightsPositiveCategories}</p>
          <ul className="mt-1 space-y-1">
            {payload.positiveCategoryCounts.map((item) => (
              <li key={item.categoryCode}>
                {dictionary.categories[item.categoryCode].label}: {item.count}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {"difficultCategoryCounts" in payload && payload.difficultCategoryCounts.length > 0 ? (
        <div>
          <p className="font-medium">{dictionary.app.insightsDifficultCategories}</p>
          <ul className="mt-1 space-y-1">
            {payload.difficultCategoryCounts.map((item) => (
              <li key={item.categoryCode}>
                {dictionary.categories[item.categoryCode].label}: {item.count}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
