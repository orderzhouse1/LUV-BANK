import type {
  InsightObservationCode,
  InsightSummaryResponse,
  NudgeActionCode,
  NudgeCode,
  NudgePayload,
  NudgeWindow,
} from "@luv-bank/validation";
import { DEFAULT_NUDGE_SUPPRESSIONS, GENTLE_NUDGE_ACTION_CATALOG } from "@luv-bank/validation";

/**
 * Structured eligibility inputs derived from Phase 4 insight aggregates.
 * Must never include notes, identity, tokens, or request metadata.
 */
export type NudgeEligibilityInput = {
  selectedWindow: NudgeWindow;
  observationCodes: ReadonlySet<InsightObservationCode>;
  current: {
    positiveContribution: number;
    difficultContribution: number;
    netBalance: number;
    totalMoments: number;
  };
  previous: {
    netBalance: number;
    totalMoments: number;
  };
  activeBucketCount: number;
  scoringVersionsPresent: readonly string[];
};

export function eligibilityFromInsightSummary(
  summary: InsightSummaryResponse,
  scoringVersionsPresent: readonly string[] = [],
): NudgeEligibilityInput {
  return {
    selectedWindow: summary.selectedWindow,
    observationCodes: new Set(summary.observations.map((o) => o.code)),
    current: {
      positiveContribution: summary.currentPeriod.positiveContribution,
      difficultContribution: summary.currentPeriod.difficultContribution,
      netBalance: summary.currentPeriod.netBalance,
      totalMoments: summary.currentPeriod.totalMoments,
    },
    previous: {
      netBalance: summary.previousPeriod.netBalance,
      totalMoments: summary.previousPeriod.totalMoments,
    },
    activeBucketCount: summary.buckets.filter((bucket) => bucket.totalMoments > 0).length,
    scoringVersionsPresent,
  };
}

function actionsFor(code: NudgeCode): NudgeActionCode[] {
  return [...GENTLE_NUDGE_ACTION_CATALOG[code]];
}

function payload(code: NudgeCode, rationale: InsightObservationCode[]): NudgePayload {
  return {
    code,
    rationaleObservationCodes: rationale,
    actionCodes: actionsFor(code),
    optional: true,
    availableSuppressions: [...DEFAULT_NUDGE_SUPPRESSIONS],
  };
}

/**
 * Deterministic priority evaluator for GENTLE_NUDGES_V1.
 * First matching rule wins. Never diagnoses or directs the user.
 */
export function evaluateGentleNudgesV1(input: NudgeEligibilityInput): NudgePayload | null {
  const codes = input.observationCodes;

  if (codes.has("NO_RECORDED_MOMENTS")) {
    return payload("START_WITH_ONE_PRIVATE_MOMENT", ["NO_RECORDED_MOMENTS"]);
  }

  if (codes.has("LIMITED_RECORDED_DATA")) {
    return payload("KEEP_RECORDING_AT_YOUR_OWN_PACE", ["LIMITED_RECORDED_DATA"]);
  }

  if (codes.has("DIFFICULT_CONTRIBUTION_GREATER")) {
    return payload("MAKE_SPACE_BEFORE_YOUR_NEXT_STEP", ["DIFFICULT_CONTRIBUTION_GREATER"]);
  }

  if (codes.has("POSITIVE_CONTRIBUTION_GREATER")) {
    return payload("BUILD_ON_RECORDED_POSITIVE_MOMENTS", ["POSITIVE_CONTRIBUTION_GREATER"]);
  }

  if (codes.has("NET_BALANCE_INCREASED") || codes.has("NET_BALANCE_DECREASED")) {
    const rationale: InsightObservationCode[] = [];
    if (codes.has("NET_BALANCE_INCREASED")) rationale.push("NET_BALANCE_INCREASED");
    if (codes.has("NET_BALANCE_DECREASED")) rationale.push("NET_BALANCE_DECREASED");
    return payload("NOTICE_A_CHANGE_WITHOUT_JUDGMENT", rationale);
  }

  if (codes.has("ENOUGH_RECORDED_DATA") || codes.has("CONTRIBUTIONS_EQUAL")) {
    const rationale: InsightObservationCode[] = [];
    if (codes.has("ENOUGH_RECORDED_DATA")) rationale.push("ENOUGH_RECORDED_DATA");
    if (codes.has("CONTRIBUTIONS_EQUAL")) rationale.push("CONTRIBUTIONS_EQUAL");
    return payload("CHOOSE_ONE_SMALL_INTENTIONAL_STEP", rationale);
  }

  return null;
}
