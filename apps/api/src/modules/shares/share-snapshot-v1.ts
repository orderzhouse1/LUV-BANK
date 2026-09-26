import {
  DESCRIPTIVE_INSIGHTS_V1,
  INSIGHT_BUCKET_LAYOUT,
  PRIVATE_SHARE_SNAPSHOT_V1,
  privateShareSnapshotPayloadSchema,
  type AggregateMomentInput,
  type PrivateShareSnapshotPayload,
  type ShareExpirationDuration,
  type ShareScopeCode,
  type ShareWindow,
  SHARE_EXPIRATION_MS,
} from "@luv-bank/validation";
import {
  buildTrendBuckets,
  categoryFrequency,
  filterPeriod,
  rollingPeriodBounds,
} from "../insights/descriptive-insights-v1";

function scoringVersions(moments: AggregateMomentInput[]): string[] {
  return [...new Set(moments.map((m) => m.scoringVersion))].sort();
}

function periodTotals(moments: AggregateMomentInput[]) {
  let positiveContribution = 0;
  let difficultContribution = 0;
  let netBalance = 0;
  for (const moment of moments) {
    netBalance += moment.scoreImpact;
    if (moment.scoreImpact > 0) positiveContribution += moment.scoreImpact;
    else if (moment.scoreImpact < 0) difficultContribution += Math.abs(moment.scoreImpact);
  }
  return {
    positiveContribution,
    difficultContribution,
    netBalance,
    totalMoments: moments.length,
  };
}

export function computeShareExpiresAt(createdAt: Date, expiration: ShareExpirationDuration): Date {
  return new Date(createdAt.getTime() + SHARE_EXPIRATION_MS[expiration]);
}

/**
 * Builds an immutable PRIVATE_SHARE_SNAPSHOT_V1 payload from structured aggregates only.
 * Never includes notes, moment IDs, identity, nudges, or reminders.
 */
export function buildPrivateShareSnapshotV1(input: {
  scope: ShareScopeCode;
  window: ShareWindow;
  moments: AggregateMomentInput[];
  createdAt: Date;
  expiresAt: Date;
}): PrivateShareSnapshotPayload {
  const layout = INSIGHT_BUCKET_LAYOUT[input.window];
  const bounds = rollingPeriodBounds(layout.days, input.createdAt);
  const currentMoments = filterPeriod(input.moments, bounds.currentStart, bounds.currentEnd, true);
  const previousMoments = filterPeriod(
    input.moments,
    bounds.previousStart,
    bounds.previousEnd,
    false,
  );
  const versions = scoringVersions(input.moments);
  const createdAt = input.createdAt.toISOString();
  const expiresAt = input.expiresAt.toISOString();

  if (input.scope === "POSITIVE_ONLY") {
    const positiveMoments = currentMoments.filter((m) => m.kind === "POSITIVE");
    const totals = periodTotals(positiveMoments);
    return privateShareSnapshotPayloadSchema.parse({
      snapshotVersion: PRIVATE_SHARE_SNAPSHOT_V1,
      scope: "POSITIVE_ONLY",
      selectedWindow: input.window,
      period: {
        startsAt: bounds.currentStart.toISOString(),
        endsAt: bounds.currentEnd.toISOString(),
        positiveContribution: totals.positiveContribution,
        positiveMomentCount: positiveMoments.length,
      },
      positiveCategoryCounts: categoryFrequency(positiveMoments, "POSITIVE"),
      scoringVersionsPresent: versions,
      createdAt,
      expiresAt,
    });
  }

  if (input.scope === "SELECTED_PERIOD_SUMMARY") {
    const totals = periodTotals(currentMoments);
    return privateShareSnapshotPayloadSchema.parse({
      snapshotVersion: PRIVATE_SHARE_SNAPSHOT_V1,
      scope: "SELECTED_PERIOD_SUMMARY",
      selectedWindow: input.window,
      period: {
        startsAt: bounds.currentStart.toISOString(),
        endsAt: bounds.currentEnd.toISOString(),
        ...totals,
      },
      positiveCategoryCounts: categoryFrequency(currentMoments, "POSITIVE"),
      difficultCategoryCounts: categoryFrequency(currentMoments, "DIFFICULT"),
      scoringVersionsPresent: versions,
      createdAt,
      expiresAt,
    });
  }

  const current = periodTotals(currentMoments);
  const previous = periodTotals(previousMoments);
  const lifetime = periodTotals(input.moments);
  const buckets = buildTrendBuckets(input.moments, input.window, input.createdAt);

  return privateShareSnapshotPayloadSchema.parse({
    snapshotVersion: PRIVATE_SHARE_SNAPSHOT_V1,
    scope: "EXTENDED_BALANCE_SUMMARY",
    selectedWindow: input.window,
    insightRulesetVersion: DESCRIPTIVE_INSIGHTS_V1,
    lifetime,
    currentPeriod: {
      startsAt: bounds.currentStart.toISOString(),
      endsAt: bounds.currentEnd.toISOString(),
      ...current,
    },
    previousPeriod: {
      startsAt: bounds.previousStart.toISOString(),
      endsAt: bounds.previousEnd.toISOString(),
      ...previous,
    },
    changeFromPrevious: {
      netBalance: current.netBalance - previous.netBalance,
    },
    buckets,
    positiveCategoryCounts: categoryFrequency(currentMoments, "POSITIVE"),
    difficultCategoryCounts: categoryFrequency(currentMoments, "DIFFICULT"),
    scoringVersionsPresent: versions,
    createdAt,
    expiresAt,
  });
}
