import { z } from "zod";
import { momentCategoryCodeSchema, type MomentCategoryCode } from "./moments";
import { periodContributionSchema } from "./scoring";

/** Immutable descriptive insight ruleset identifier. */
export const DESCRIPTIVE_INSIGHTS_V1 = "DESCRIPTIVE_INSIGHTS_V1" as const;

export const insightRulesetSchema = z.literal(DESCRIPTIVE_INSIGHTS_V1);
export type InsightRulesetId = z.infer<typeof insightRulesetSchema>;

export const REVIEWED_INSIGHT_RULESETS = [DESCRIPTIVE_INSIGHTS_V1] as const;

export const insightWindowSchema = z.enum(["7d", "30d", "90d"]);
export type InsightWindow = z.infer<typeof insightWindowSchema>;

export const insightSummaryQuerySchema = z.object({
  window: insightWindowSchema.default("30d"),
});

export type InsightSummaryQuery = z.infer<typeof insightSummaryQuerySchema>;

export const insightObservationCodeSchema = z.enum([
  "NO_RECORDED_MOMENTS",
  "LIMITED_RECORDED_DATA",
  "ENOUGH_RECORDED_DATA",
  "POSITIVE_CONTRIBUTION_GREATER",
  "DIFFICULT_CONTRIBUTION_GREATER",
  "CONTRIBUTIONS_EQUAL",
  "NET_BALANCE_INCREASED",
  "NET_BALANCE_DECREASED",
  "NET_BALANCE_UNCHANGED",
  "NO_PREVIOUS_PERIOD_ACTIVITY",
  "RECORDING_ACTIVITY_INCREASED",
  "RECORDING_ACTIVITY_DECREASED",
  "RECORDING_ACTIVITY_UNCHANGED",
  "MOST_RECORDED_POSITIVE_CATEGORY",
  "MOST_RECORDED_DIFFICULT_CATEGORY",
  "MULTIPLE_TOP_POSITIVE_CATEGORIES",
  "MULTIPLE_TOP_DIFFICULT_CATEGORIES",
  "NO_POSITIVE_CATEGORY_ACTIVITY",
  "NO_DIFFICULT_CATEGORY_ACTIVITY",
]);

export type InsightObservationCode = z.infer<typeof insightObservationCodeSchema>;

export const insightObservationSchema = z.object({
  code: insightObservationCodeSchema,
  parameters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

export type InsightObservation = z.infer<typeof insightObservationSchema>;

export const trendBucketSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  positiveContribution: z.number().int(),
  difficultContribution: z.number().int().nonnegative(),
  netBalance: z.number().int(),
  totalMoments: z.number().int().nonnegative(),
});

export type TrendBucket = z.infer<typeof trendBucketSchema>;

export const categoryFrequencyItemSchema = z.object({
  categoryCode: momentCategoryCodeSchema,
  count: z.number().int().nonnegative(),
});

export type CategoryFrequencyItem = z.infer<typeof categoryFrequencyItemSchema>;

export const insightSummaryResponseSchema = z.object({
  insightRuleset: insightRulesetSchema,
  scoringVersion: z.string().min(1),
  selectedWindow: insightWindowSchema,
  generatedAt: z.string().datetime(),
  currentPeriod: periodContributionSchema.extend({
    startsAt: z.string().datetime(),
  }),
  previousPeriod: periodContributionSchema.extend({
    startsAt: z.string().datetime(),
  }),
  changeFromPrevious: z.object({
    netBalance: z.number().int(),
    totalMoments: z.number().int(),
  }),
  buckets: z.array(trendBucketSchema),
  categoryFrequency: z.object({
    positive: z.array(categoryFrequencyItemSchema),
    difficult: z.array(categoryFrequencyItemSchema),
  }),
  observations: z.array(insightObservationSchema),
});

export type InsightSummaryResponse = z.infer<typeof insightSummaryResponseSchema>;

/** Bucket layout for DESCRIPTIVE_INSIGHTS_V1. */
export const INSIGHT_BUCKET_LAYOUT: Record<
  InsightWindow,
  { days: number; bucketCount: number; bucketDays: number }
> = {
  "7d": { days: 7, bucketCount: 7, bucketDays: 1 },
  "30d": { days: 30, bucketCount: 10, bucketDays: 3 },
  "90d": { days: 90, bucketCount: 15, bucketDays: 6 },
};

export type AggregateMomentInput = {
  kind: "POSITIVE" | "DIFFICULT";
  categoryCode: MomentCategoryCode;
  scoreImpact: number;
  scoringVersion: string;
  occurredAt: Date;
};
