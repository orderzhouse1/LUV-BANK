import { z } from "zod";

/** Stable domain enums mirrored by Prisma. Never use translated labels as enum values. */
export const momentKindSchema = z.enum(["POSITIVE", "DIFFICULT"]);
export type MomentKind = z.infer<typeof momentKindSchema>;

export const relationshipStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export type RelationshipStatus = z.infer<typeof relationshipStatusSchema>;

export const shareScopeSchema = z.enum([
  "POSITIVE_ONLY",
  "SELECTED_PERIOD_SUMMARY",
  "EXTENDED_BALANCE_SUMMARY",
]);
export type ShareScope = z.infer<typeof shareScopeSchema>;
/** Alias used by Phase 7 share APIs. */
export type ShareScopeCode = ShareScope;

export const trendDirectionSchema = z.enum(["UP", "DOWN", "FLAT"]);
export type TrendDirection = z.infer<typeof trendDirectionSchema>;

export const relationshipStateSchema = z.enum(["THRIVING", "STEADY", "STRUGGLING"]);
export type RelationshipState = z.infer<typeof relationshipStateSchema>;
