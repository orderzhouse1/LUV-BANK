import { describe, expect, it } from "vitest";
import type { InsightSummaryResponse } from "@luv-bank/validation";
import { DESCRIPTIVE_INSIGHTS_V1, MVP_EQUAL_WEIGHT_V1 } from "@luv-bank/validation";
import { eligibilityFromInsightSummary, evaluateGentleNudgesV1 } from "./gentle-nudges-v1";

function baseSummary(
  overrides: Partial<InsightSummaryResponse> & {
    observations: InsightSummaryResponse["observations"];
  },
): InsightSummaryResponse {
  return {
    insightRuleset: DESCRIPTIVE_INSIGHTS_V1,
    scoringVersion: MVP_EQUAL_WEIGHT_V1,
    selectedWindow: "30d",
    generatedAt: "2026-08-02T12:00:00.000Z",
    currentPeriod: {
      startsAt: "2026-07-03T12:00:00.000Z",
      endsAt: "2026-08-02T12:00:00.000Z",
      positiveContribution: 0,
      difficultContribution: 0,
      netBalance: 0,
      totalMoments: 0,
    },
    previousPeriod: {
      startsAt: "2026-06-03T12:00:00.000Z",
      endsAt: "2026-07-03T12:00:00.000Z",
      positiveContribution: 0,
      difficultContribution: 0,
      netBalance: 0,
      totalMoments: 0,
    },
    changeFromPrevious: { netBalance: 0, totalMoments: 0 },
    buckets: [],
    categoryFrequency: { positive: [], difficult: [] },
    ...overrides,
  };
}

describe("GENTLE_NUDGES_V1 evaluator", () => {
  it("suggests starting with one moment when none are recorded", () => {
    const input = eligibilityFromInsightSummary(
      baseSummary({
        observations: [{ code: "NO_RECORDED_MOMENTS", parameters: {} }],
      }),
    );
    expect(evaluateGentleNudgesV1(input)?.code).toBe("START_WITH_ONE_PRIVATE_MOMENT");
  });

  it("suggests making space when difficult contribution is greater", () => {
    const input = eligibilityFromInsightSummary(
      baseSummary({
        currentPeriod: {
          startsAt: "2026-07-03T12:00:00.000Z",
          endsAt: "2026-08-02T12:00:00.000Z",
          positiveContribution: 1,
          difficultContribution: 3,
          netBalance: -2,
          totalMoments: 4,
        },
        observations: [
          { code: "ENOUGH_RECORDED_DATA", parameters: {} },
          { code: "DIFFICULT_CONTRIBUTION_GREATER", parameters: {} },
        ],
      }),
    );
    expect(evaluateGentleNudgesV1(input)?.code).toBe("MAKE_SPACE_BEFORE_YOUR_NEXT_STEP");
  });

  it("marks every nudge as optional with suppressions", () => {
    const input = eligibilityFromInsightSummary(
      baseSummary({
        observations: [{ code: "NO_RECORDED_MOMENTS", parameters: {} }],
      }),
    );
    const nudge = evaluateGentleNudgesV1(input)!;
    expect(nudge.optional).toBe(true);
    expect(nudge.availableSuppressions).toEqual(["1d", "7d", "30d"]);
    expect(nudge.actionCodes.length).toBeGreaterThan(0);
  });
});
