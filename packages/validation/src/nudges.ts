import { z } from "zod";
import { insightObservationCodeSchema, insightWindowSchema } from "./insights";

/** Immutable gentle-nudge ruleset identifier. */
export const GENTLE_NUDGES_V1 = "GENTLE_NUDGES_V1" as const;

export const nudgeRulesetSchema = z.literal(GENTLE_NUDGES_V1);
export type NudgeRulesetId = z.infer<typeof nudgeRulesetSchema>;

export const REVIEWED_NUDGE_RULESETS = [GENTLE_NUDGES_V1] as const;

export const nudgeWindowSchema = insightWindowSchema;
export type NudgeWindow = z.infer<typeof nudgeWindowSchema>;

export const nudgeSummaryQuerySchema = z.object({
  window: nudgeWindowSchema.default("30d"),
});

export type NudgeSummaryQuery = z.infer<typeof nudgeSummaryQuerySchema>;

export const nudgeCodeSchema = z.enum([
  "START_WITH_ONE_PRIVATE_MOMENT",
  "KEEP_RECORDING_AT_YOUR_OWN_PACE",
  "BUILD_ON_RECORDED_POSITIVE_MOMENTS",
  "MAKE_SPACE_BEFORE_YOUR_NEXT_STEP",
  "CHOOSE_ONE_SMALL_INTENTIONAL_STEP",
  "NOTICE_A_CHANGE_WITHOUT_JUDGMENT",
]);

export type NudgeCode = z.infer<typeof nudgeCodeSchema>;

export const nudgeActionCodeSchema = z.enum([
  "LOG_ONE_PRIVATE_MOMENT",
  "REVIEW_RECENT_MOMENTS",
  "PAUSE_BEFORE_RESPONDING",
  "WRITE_PRIVATE_REFLECTION",
  "NOTICE_ONE_SMALL_POSITIVE",
  "TAKE_A_CALM_BREATH",
  "CHOOSE_ONE_GENTLE_STEP",
]);

export type NudgeActionCode = z.infer<typeof nudgeActionCodeSchema>;

export const nudgeSuppressionDurationSchema = z.enum(["1d", "7d", "30d"]);
export type NudgeSuppressionDuration = z.infer<typeof nudgeSuppressionDurationSchema>;

export const suppressNudgeRequestSchema = z.object({
  nudgeCode: nudgeCodeSchema,
  duration: nudgeSuppressionDurationSchema,
});

export type SuppressNudgeRequest = z.infer<typeof suppressNudgeRequestSchema>;

export const nudgePayloadSchema = z.object({
  code: nudgeCodeSchema,
  rationaleObservationCodes: z.array(insightObservationCodeSchema),
  actionCodes: z.array(nudgeActionCodeSchema).min(1),
  optional: z.literal(true),
  availableSuppressions: z.array(nudgeSuppressionDurationSchema),
});

export type NudgePayload = z.infer<typeof nudgePayloadSchema>;

export const nudgeCurrentResponseSchema = z.object({
  nudgeRulesetVersion: nudgeRulesetSchema,
  selectedWindow: nudgeWindowSchema,
  generatedAt: z.string().datetime(),
  nudge: nudgePayloadSchema.nullable(),
});

export type NudgeCurrentResponse = z.infer<typeof nudgeCurrentResponseSchema>;

/** Catalog of action codes allowed by each nudge under GENTLE_NUDGES_V1. */
export const GENTLE_NUDGE_ACTION_CATALOG: Readonly<Record<NudgeCode, readonly NudgeActionCode[]>> =
  {
    START_WITH_ONE_PRIVATE_MOMENT: ["LOG_ONE_PRIVATE_MOMENT", "REVIEW_RECENT_MOMENTS"],
    KEEP_RECORDING_AT_YOUR_OWN_PACE: [
      "LOG_ONE_PRIVATE_MOMENT",
      "CHOOSE_ONE_GENTLE_STEP",
      "REVIEW_RECENT_MOMENTS",
    ],
    BUILD_ON_RECORDED_POSITIVE_MOMENTS: [
      "NOTICE_ONE_SMALL_POSITIVE",
      "LOG_ONE_PRIVATE_MOMENT",
      "REVIEW_RECENT_MOMENTS",
    ],
    MAKE_SPACE_BEFORE_YOUR_NEXT_STEP: [
      "PAUSE_BEFORE_RESPONDING",
      "TAKE_A_CALM_BREATH",
      "WRITE_PRIVATE_REFLECTION",
      "REVIEW_RECENT_MOMENTS",
    ],
    CHOOSE_ONE_SMALL_INTENTIONAL_STEP: [
      "CHOOSE_ONE_GENTLE_STEP",
      "LOG_ONE_PRIVATE_MOMENT",
      "REVIEW_RECENT_MOMENTS",
    ],
    NOTICE_A_CHANGE_WITHOUT_JUDGMENT: [
      "REVIEW_RECENT_MOMENTS",
      "WRITE_PRIVATE_REFLECTION",
      "NOTICE_ONE_SMALL_POSITIVE",
    ],
  };

export const DEFAULT_NUDGE_SUPPRESSIONS: NudgeSuppressionDuration[] = ["1d", "7d", "30d"];
