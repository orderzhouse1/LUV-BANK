import {
  DESCRIPTIVE_INSIGHTS_V1,
  INSIGHT_BUCKET_LAYOUT,
  type AggregateMomentInput,
  type CategoryFrequencyItem,
  type InsightObservation,
  type InsightWindow,
  type TrendBucket,
  type MomentCategoryCode,
} from "@luv-bank/validation";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LIMITED_DATA_MAX = 2;

export type PeriodStats = {
  startsAt: Date;
  endsAt: Date;
  positiveContribution: number;
  difficultContribution: number;
  netBalance: number;
  totalMoments: number;
};

function sumStats(moments: AggregateMomentInput[]): Omit<PeriodStats, "startsAt" | "endsAt"> {
  let positiveContribution = 0;
  let difficultContribution = 0;
  let netBalance = 0;
  for (const moment of moments) {
    netBalance += moment.scoreImpact;
    if (moment.scoreImpact > 0) {
      positiveContribution += moment.scoreImpact;
    } else if (moment.scoreImpact < 0) {
      difficultContribution += Math.abs(moment.scoreImpact);
    }
  }
  return {
    positiveContribution,
    difficultContribution,
    netBalance,
    totalMoments: moments.length,
  };
}

/**
 * Half-open [start, end) — except the final bucket of a period, which is
 * closed on the end (`<= endsAt`) so moments at generatedAt are included.
 */
export function momentInInterval(
  occurredAt: Date,
  start: Date,
  end: Date,
  options: { inclusiveEnd: boolean },
): boolean {
  const t = occurredAt.getTime();
  if (t < start.getTime()) return false;
  if (options.inclusiveEnd) {
    return t <= end.getTime();
  }
  return t < end.getTime();
}

export function rollingPeriodBounds(
  days: number,
  generatedAt: Date,
): {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
} {
  const currentEnd = generatedAt;
  const currentStart = new Date(generatedAt.getTime() - days * MS_PER_DAY);
  const previousEnd = currentStart;
  const previousStart = new Date(currentStart.getTime() - days * MS_PER_DAY);
  return { currentStart, currentEnd, previousStart, previousEnd };
}

export function filterPeriod(
  moments: AggregateMomentInput[],
  start: Date,
  end: Date,
  inclusiveEnd: boolean,
): AggregateMomentInput[] {
  return moments.filter((m) => momentInInterval(m.occurredAt, start, end, { inclusiveEnd }));
}

export function buildTrendBuckets(
  moments: AggregateMomentInput[],
  window: InsightWindow,
  generatedAt: Date,
): TrendBucket[] {
  const layout = INSIGHT_BUCKET_LAYOUT[window];
  const periodStart = new Date(generatedAt.getTime() - layout.days * MS_PER_DAY);
  const bucketMs = layout.bucketDays * MS_PER_DAY;
  const buckets: TrendBucket[] = [];

  for (let i = 0; i < layout.bucketCount; i++) {
    const startsAt = new Date(periodStart.getTime() + i * bucketMs);
    const endsAt = new Date(periodStart.getTime() + (i + 1) * bucketMs);
    const isLast = i === layout.bucketCount - 1;
    const inBucket = moments.filter((m) =>
      momentInInterval(m.occurredAt, startsAt, endsAt, { inclusiveEnd: isLast }),
    );
    buckets.push({
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      ...sumStats(inBucket),
    });
  }

  return buckets;
}

export function categoryFrequency(
  moments: AggregateMomentInput[],
  kind: "POSITIVE" | "DIFFICULT",
): CategoryFrequencyItem[] {
  const counts = new Map<MomentCategoryCode, number>();
  for (const moment of moments) {
    if (moment.kind !== kind) continue;
    counts.set(moment.categoryCode, (counts.get(moment.categoryCode) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([categoryCode, count]) => ({ categoryCode, count }))
    .sort((a, b) => b.count - a.count || a.categoryCode.localeCompare(b.categoryCode));
}

function topCategoryCodes(items: CategoryFrequencyItem[]): {
  top: CategoryFrequencyItem[];
  tied: boolean;
} {
  if (items.length === 0) {
    return { top: [], tied: false };
  }
  const max = items[0]!.count;
  const top = items.filter((item) => item.count === max);
  return { top, tied: top.length > 1 };
}

/**
 * DESCRIPTIVE_INSIGHTS_V1 observation evaluator.
 * Returns structured codes only — no prose, no clinical labels.
 */
export function evaluateDescriptiveInsightsV1(input: {
  current: PeriodStats;
  previous: PeriodStats;
  currentMoments: AggregateMomentInput[];
}): InsightObservation[] {
  const observations: InsightObservation[] = [];
  const { current, previous, currentMoments } = input;

  if (current.totalMoments === 0) {
    observations.push({ code: "NO_RECORDED_MOMENTS", parameters: {} });
  } else if (current.totalMoments <= LIMITED_DATA_MAX) {
    observations.push({
      code: "LIMITED_RECORDED_DATA",
      parameters: { totalMoments: current.totalMoments },
    });
  } else {
    observations.push({
      code: "ENOUGH_RECORDED_DATA",
      parameters: { totalMoments: current.totalMoments },
    });
  }

  if (current.totalMoments > 0) {
    if (current.positiveContribution > current.difficultContribution) {
      observations.push({
        code: "POSITIVE_CONTRIBUTION_GREATER",
        parameters: {
          positiveContribution: current.positiveContribution,
          difficultContribution: current.difficultContribution,
        },
      });
    } else if (current.difficultContribution > current.positiveContribution) {
      observations.push({
        code: "DIFFICULT_CONTRIBUTION_GREATER",
        parameters: {
          positiveContribution: current.positiveContribution,
          difficultContribution: current.difficultContribution,
        },
      });
    } else {
      observations.push({
        code: "CONTRIBUTIONS_EQUAL",
        parameters: {
          positiveContribution: current.positiveContribution,
          difficultContribution: current.difficultContribution,
        },
      });
    }
  }

  if (previous.totalMoments === 0) {
    observations.push({ code: "NO_PREVIOUS_PERIOD_ACTIVITY", parameters: {} });
  } else {
    const change = current.netBalance - previous.netBalance;
    if (change > 0) {
      observations.push({
        code: "NET_BALANCE_INCREASED",
        parameters: {
          currentNetBalance: current.netBalance,
          previousNetBalance: previous.netBalance,
          change,
        },
      });
    } else if (change < 0) {
      observations.push({
        code: "NET_BALANCE_DECREASED",
        parameters: {
          currentNetBalance: current.netBalance,
          previousNetBalance: previous.netBalance,
          change,
        },
      });
    } else {
      observations.push({
        code: "NET_BALANCE_UNCHANGED",
        parameters: {
          currentNetBalance: current.netBalance,
          previousNetBalance: previous.netBalance,
          change: 0,
        },
      });
    }

    const activityDelta = current.totalMoments - previous.totalMoments;
    if (activityDelta > 0) {
      observations.push({
        code: "RECORDING_ACTIVITY_INCREASED",
        parameters: {
          currentTotalMoments: current.totalMoments,
          previousTotalMoments: previous.totalMoments,
          change: activityDelta,
        },
      });
    } else if (activityDelta < 0) {
      observations.push({
        code: "RECORDING_ACTIVITY_DECREASED",
        parameters: {
          currentTotalMoments: current.totalMoments,
          previousTotalMoments: previous.totalMoments,
          change: activityDelta,
        },
      });
    } else {
      observations.push({
        code: "RECORDING_ACTIVITY_UNCHANGED",
        parameters: {
          currentTotalMoments: current.totalMoments,
          previousTotalMoments: previous.totalMoments,
          change: 0,
        },
      });
    }
  }

  const positiveFreq = categoryFrequency(currentMoments, "POSITIVE");
  const difficultFreq = categoryFrequency(currentMoments, "DIFFICULT");

  if (positiveFreq.length === 0) {
    observations.push({ code: "NO_POSITIVE_CATEGORY_ACTIVITY", parameters: {} });
  } else {
    const { top, tied } = topCategoryCodes(positiveFreq);
    if (tied) {
      observations.push({
        code: "MULTIPLE_TOP_POSITIVE_CATEGORIES",
        parameters: {
          count: top[0]!.count,
          categoryCodes: top.map((t) => t.categoryCode).join(","),
        },
      });
    } else {
      observations.push({
        code: "MOST_RECORDED_POSITIVE_CATEGORY",
        parameters: {
          categoryCode: top[0]!.categoryCode,
          count: top[0]!.count,
        },
      });
    }
  }

  if (difficultFreq.length === 0) {
    observations.push({ code: "NO_DIFFICULT_CATEGORY_ACTIVITY", parameters: {} });
  } else {
    const { top, tied } = topCategoryCodes(difficultFreq);
    if (tied) {
      observations.push({
        code: "MULTIPLE_TOP_DIFFICULT_CATEGORIES",
        parameters: {
          count: top[0]!.count,
          categoryCodes: top.map((t) => t.categoryCode).join(","),
        },
      });
    } else {
      observations.push({
        code: "MOST_RECORDED_DIFFICULT_CATEGORY",
        parameters: {
          categoryCode: top[0]!.categoryCode,
          count: top[0]!.count,
        },
      });
    }
  }

  return observations;
}

export function assertDescriptiveInsightsV1(): void {
  if (DESCRIPTIVE_INSIGHTS_V1 !== "DESCRIPTIVE_INSIGHTS_V1") {
    throw new Error("Unexpected insight ruleset identity.");
  }
  for (const window of Object.keys(INSIGHT_BUCKET_LAYOUT) as InsightWindow[]) {
    const layout = INSIGHT_BUCKET_LAYOUT[window];
    if (layout.bucketCount * layout.bucketDays !== layout.days) {
      throw new Error(`Bucket layout for ${window} does not cover the window exactly.`);
    }
  }
}

assertDescriptiveInsightsV1();
