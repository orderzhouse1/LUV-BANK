import {
  ACTIVE_SCORING_VERSION,
  DESCRIPTIVE_INSIGHTS_V1,
  INSIGHT_BUCKET_LAYOUT,
  insightSummaryQuerySchema,
  insightSummaryResponseSchema,
  type AggregateMomentInput,
  type InsightSummaryResponse,
  type InsightWindow,
} from "@luv-bank/validation";
import type { ApiEnv } from "../../config/env";
import { AppError } from "../../errors/app-error";
import type { AuthRepository } from "../auth/auth.types";
import type { MomentRepository } from "../moments/moment.types";
import {
  buildTrendBuckets,
  categoryFrequency,
  evaluateDescriptiveInsightsV1,
  filterPeriod,
  rollingPeriodBounds,
  type PeriodStats,
} from "./descriptive-insights-v1";

function toAggregate(
  moments: Awaited<ReturnType<MomentRepository["listAllForProfile"]>>,
): AggregateMomentInput[] {
  return moments.map((m) => ({
    kind: m.kind,
    categoryCode: m.categoryCode,
    scoreImpact: m.scoreImpact,
    scoringVersion: m.scoringVersion,
    occurredAt: m.occurredAt,
  }));
}

function periodStats(
  moments: AggregateMomentInput[],
  start: Date,
  end: Date,
  inclusiveEnd: boolean,
): PeriodStats {
  const filtered = filterPeriod(moments, start, end, inclusiveEnd);
  let positiveContribution = 0;
  let difficultContribution = 0;
  let netBalance = 0;
  for (const moment of filtered) {
    netBalance += moment.scoreImpact;
    if (moment.scoreImpact > 0) positiveContribution += moment.scoreImpact;
    else if (moment.scoreImpact < 0) difficultContribution += Math.abs(moment.scoreImpact);
  }
  return {
    startsAt: start,
    endsAt: end,
    positiveContribution,
    difficultContribution,
    netBalance,
    totalMoments: filtered.length,
  };
}

export class InsightService {
  constructor(
    private readonly env: ApiEnv,
    private readonly authRepo: AuthRepository,
    private readonly momentRepo: MomentRepository,
  ) {
    if (this.env.ACTIVE_INSIGHT_RULESET !== DESCRIPTIVE_INSIGHTS_V1) {
      throw new Error(`Unsupported ACTIVE_INSIGHT_RULESET: ${this.env.ACTIVE_INSIGHT_RULESET}`);
    }
  }

  private async requireActiveProfileId(userId: string): Promise<string> {
    const profile = await this.authRepo.findActiveProfileForUser(userId);
    if (!profile || profile.status !== "ACTIVE" || profile.archivedAt) {
      throw new AppError(
        400,
        "PROFILE_REQUIRED",
        "An active relationship profile is required before viewing insights.",
      );
    }
    return profile.id;
  }

  async summarize(
    userId: string,
    rawQuery: unknown,
    generatedAt = new Date(),
  ): Promise<InsightSummaryResponse> {
    const query = insightSummaryQuerySchema.parse(rawQuery);
    const window = query.window as InsightWindow;
    const profileId = await this.requireActiveProfileId(userId);
    const allMoments = toAggregate(await this.momentRepo.listAllForProfile(profileId));

    const layout = INSIGHT_BUCKET_LAYOUT[window];
    const bounds = rollingPeriodBounds(layout.days, generatedAt);

    // Current period: [start, generatedAt] (inclusive end for the live edge).
    // Previous period: [prevStart, currentStart) so boundary moments are not double-counted.
    const current = periodStats(allMoments, bounds.currentStart, bounds.currentEnd, true);
    const previous = periodStats(allMoments, bounds.previousStart, bounds.previousEnd, false);
    const currentMoments = filterPeriod(allMoments, bounds.currentStart, bounds.currentEnd, true);

    const buckets = buildTrendBuckets(allMoments, window, generatedAt);
    const observations = evaluateDescriptiveInsightsV1({
      current,
      previous,
      currentMoments,
    });

    return insightSummaryResponseSchema.parse({
      insightRuleset: DESCRIPTIVE_INSIGHTS_V1,
      scoringVersion: ACTIVE_SCORING_VERSION,
      selectedWindow: window,
      generatedAt: generatedAt.toISOString(),
      currentPeriod: {
        startsAt: current.startsAt.toISOString(),
        endsAt: current.endsAt.toISOString(),
        positiveContribution: current.positiveContribution,
        difficultContribution: current.difficultContribution,
        netBalance: current.netBalance,
        totalMoments: current.totalMoments,
      },
      previousPeriod: {
        startsAt: previous.startsAt.toISOString(),
        endsAt: previous.endsAt.toISOString(),
        positiveContribution: previous.positiveContribution,
        difficultContribution: previous.difficultContribution,
        netBalance: previous.netBalance,
        totalMoments: previous.totalMoments,
      },
      changeFromPrevious: {
        netBalance: current.netBalance - previous.netBalance,
        totalMoments: current.totalMoments - previous.totalMoments,
      },
      buckets,
      categoryFrequency: {
        positive: categoryFrequency(currentMoments, "POSITIVE"),
        difficult: categoryFrequency(currentMoments, "DIFFICULT"),
      },
      observations,
    });
  }
}
