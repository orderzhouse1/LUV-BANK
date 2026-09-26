import { z } from "zod";
import {
  ALL_CATEGORY_CODES,
  DIFFICULT_CATEGORY_CODES,
  POSITIVE_CATEGORY_CODES,
  type MomentCategoryCode,
} from "./moments";
import { momentKindSchema, type MomentKind } from "./enums";

/** Immutable MVP scoring policy identifier. */
export const MVP_EQUAL_WEIGHT_V1 = "MVP_EQUAL_WEIGHT_V1" as const;

export const scoringVersionSchema = z.literal(MVP_EQUAL_WEIGHT_V1);
export type ScoringVersion = z.infer<typeof scoringVersionSchema>;

export const ACTIVE_SCORING_VERSION: ScoringVersion = MVP_EQUAL_WEIGHT_V1;

export type ScoreEvaluation = {
  scoreImpact: number;
  scoringVersion: ScoringVersion;
};

/**
 * Explicit equal-weight map for MVP_EQUAL_WEIGHT_V1.
 * Every Phase 2 category code must appear exactly once.
 */
export const MVP_EQUAL_WEIGHT_V1_IMPACTS: Readonly<Record<MomentCategoryCode, number>> = {
  AFFECTION: 1,
  APPRECIATION: 1,
  QUALITY_TIME: 1,
  SUPPORT: 1,
  SHARED_JOY: 1,
  THOUGHTFUL_GESTURE: 1,
  TENSION: -1,
  FELT_UNHEARD: -1,
  FELT_OVERLOOKED: -1,
  ARGUMENT: -1,
  EMOTIONAL_DISTANCE: -1,
  HARSH_EXCHANGE: -1,
};

export function assertMvpEqualWeightPolicyComplete(): void {
  const keys = Object.keys(MVP_EQUAL_WEIGHT_V1_IMPACTS) as MomentCategoryCode[];
  const unique = new Set(keys);
  if (keys.length !== ALL_CATEGORY_CODES.length || unique.size !== ALL_CATEGORY_CODES.length) {
    throw new Error("MVP_EQUAL_WEIGHT_V1 must list every category code exactly once.");
  }
  for (const code of ALL_CATEGORY_CODES) {
    if (!(code in MVP_EQUAL_WEIGHT_V1_IMPACTS)) {
      throw new Error(`MVP_EQUAL_WEIGHT_V1 missing category: ${code}`);
    }
  }
  for (const code of POSITIVE_CATEGORY_CODES) {
    if (MVP_EQUAL_WEIGHT_V1_IMPACTS[code] !== 1) {
      throw new Error(`Positive category ${code} must score +1 under MVP_EQUAL_WEIGHT_V1.`);
    }
  }
  for (const code of DIFFICULT_CATEGORY_CODES) {
    if (MVP_EQUAL_WEIGHT_V1_IMPACTS[code] !== -1) {
      throw new Error(`Difficult category ${code} must score -1 under MVP_EQUAL_WEIGHT_V1.`);
    }
  }
}

assertMvpEqualWeightPolicyComplete();

export function evaluateMvpEqualWeightV1(
  kind: MomentKind,
  categoryCode: MomentCategoryCode,
): ScoreEvaluation {
  const impact = MVP_EQUAL_WEIGHT_V1_IMPACTS[categoryCode];
  if (impact === undefined) {
    throw new Error(`Unknown category for scoring: ${categoryCode}`);
  }
  if (kind === "POSITIVE" && impact <= 0) {
    throw new Error(`POSITIVE kind cannot use difficult category ${categoryCode}`);
  }
  if (kind === "DIFFICULT" && impact >= 0) {
    throw new Error(`DIFFICULT kind cannot use positive category ${categoryCode}`);
  }
  return { scoreImpact: impact, scoringVersion: MVP_EQUAL_WEIGHT_V1 };
}

export function evaluateWithActiveScoringPolicy(
  kind: MomentKind,
  categoryCode: MomentCategoryCode,
): ScoreEvaluation {
  // Active selector — only MVP_EQUAL_WEIGHT_V1 exists in Phase 3.
  return evaluateMvpEqualWeightV1(kind, categoryCode);
}

export const balanceWindowSchema = z.enum(["7d", "30d", "90d", "all"]);
export type BalanceWindow = z.infer<typeof balanceWindowSchema>;

export const balanceSummaryQuerySchema = z.object({
  window: balanceWindowSchema.default("30d"),
});

export type BalanceSummaryQuery = z.infer<typeof balanceSummaryQuerySchema>;

export const periodContributionSchema = z.object({
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime(),
  positiveContribution: z.number().int(),
  difficultContribution: z.number().int().nonnegative(),
  netBalance: z.number().int(),
  totalMoments: z.number().int().nonnegative(),
});

export type PeriodContribution = z.infer<typeof periodContributionSchema>;

export const lifetimeContributionSchema = z.object({
  positiveContribution: z.number().int(),
  difficultContribution: z.number().int().nonnegative(),
  netBalance: z.number().int(),
  totalMoments: z.number().int().nonnegative(),
});

export type LifetimeContribution = z.infer<typeof lifetimeContributionSchema>;

export const balanceSummaryResponseSchema = z.object({
  scoringVersion: scoringVersionSchema,
  selectedWindow: balanceWindowSchema,
  generatedAt: z.string().datetime(),
  lifetime: lifetimeContributionSchema,
  currentPeriod: periodContributionSchema,
  previousPeriod: periodContributionSchema.nullable(),
  changeFromPrevious: z
    .object({
      netBalance: z.number().int(),
    })
    .nullable(),
});

export type BalanceSummaryResponse = z.infer<typeof balanceSummaryResponseSchema>;

export const scoredMomentFieldsSchema = z.object({
  scoreImpact: z.number().int(),
  scoringVersion: z.string().min(1),
});

/** Re-export for consumers that only need kind validation alongside scoring. */
export { momentKindSchema };
