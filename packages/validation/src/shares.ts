import { z } from "zod";
import { shareScopeSchema, type ShareScopeCode } from "./enums";
import { DESCRIPTIVE_INSIGHTS_V1 } from "./insights";
import { insightWindowSchema, trendBucketSchema } from "./insights";
import { momentCategoryCodeSchema } from "./moments";

/** Immutable private share snapshot payload version. */
export const PRIVATE_SHARE_SNAPSHOT_V1 = "PRIVATE_SHARE_SNAPSHOT_V1" as const;

export const shareSnapshotVersionSchema = z.literal(PRIVATE_SHARE_SNAPSHOT_V1);
export type ShareSnapshotVersion = z.infer<typeof shareSnapshotVersionSchema>;

export const REVIEWED_SHARE_SNAPSHOT_VERSIONS = [PRIVATE_SHARE_SNAPSHOT_V1] as const;

export { shareScopeSchema, type ShareScopeCode };

export const shareWindowSchema = insightWindowSchema;
export type ShareWindow = z.infer<typeof shareWindowSchema>;

export const shareExpirationDurationSchema = z.enum(["1d", "7d", "30d"]);
export type ShareExpirationDuration = z.infer<typeof shareExpirationDurationSchema>;

export const shareStatusSchema = z.enum(["ACTIVE", "EXPIRED", "REVOKED"]);
export type ShareStatus = z.infer<typeof shareStatusSchema>;

export const shareCategoryCountSchema = z.object({
  categoryCode: momentCategoryCodeSchema,
  count: z.number().int().nonnegative(),
});

export type ShareCategoryCount = z.infer<typeof shareCategoryCountSchema>;

const sharePeriodBoundsSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

const contributionTotalsSchema = z.object({
  positiveContribution: z.number().int(),
  difficultContribution: z.number().int().nonnegative(),
  netBalance: z.number().int(),
  totalMoments: z.number().int().nonnegative(),
});

export const createShareSnapshotRequestSchema = z.object({
  scope: shareScopeSchema,
  window: shareWindowSchema.default("30d"),
  expiration: shareExpirationDurationSchema,
});

export type CreateShareSnapshotRequest = z.infer<typeof createShareSnapshotRequestSchema>;

export const previewShareSnapshotRequestSchema = createShareSnapshotRequestSchema;
export type PreviewShareSnapshotRequest = z.infer<typeof previewShareSnapshotRequestSchema>;

export const resolveShareSnapshotRequestSchema = z.object({
  token: z.string().min(32).max(512),
});

export type ResolveShareSnapshotRequest = z.infer<typeof resolveShareSnapshotRequestSchema>;

const positiveOnlyPayloadSchema = z.object({
  snapshotVersion: shareSnapshotVersionSchema,
  scope: z.literal("POSITIVE_ONLY"),
  selectedWindow: shareWindowSchema,
  period: sharePeriodBoundsSchema.extend({
    positiveContribution: z.number().int(),
    positiveMomentCount: z.number().int().nonnegative(),
  }),
  positiveCategoryCounts: z.array(shareCategoryCountSchema),
  scoringVersionsPresent: z.array(z.string().min(1)),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

const selectedPeriodPayloadSchema = z.object({
  snapshotVersion: shareSnapshotVersionSchema,
  scope: z.literal("SELECTED_PERIOD_SUMMARY"),
  selectedWindow: shareWindowSchema,
  period: sharePeriodBoundsSchema.merge(contributionTotalsSchema),
  positiveCategoryCounts: z.array(shareCategoryCountSchema),
  difficultCategoryCounts: z.array(shareCategoryCountSchema),
  scoringVersionsPresent: z.array(z.string().min(1)),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

const extendedPayloadSchema = z.object({
  snapshotVersion: shareSnapshotVersionSchema,
  scope: z.literal("EXTENDED_BALANCE_SUMMARY"),
  selectedWindow: shareWindowSchema,
  insightRulesetVersion: z.literal(DESCRIPTIVE_INSIGHTS_V1),
  lifetime: contributionTotalsSchema,
  currentPeriod: sharePeriodBoundsSchema.merge(contributionTotalsSchema),
  previousPeriod: sharePeriodBoundsSchema.merge(contributionTotalsSchema),
  changeFromPrevious: z.object({
    netBalance: z.number().int(),
  }),
  buckets: z.array(trendBucketSchema),
  positiveCategoryCounts: z.array(shareCategoryCountSchema),
  difficultCategoryCounts: z.array(shareCategoryCountSchema),
  scoringVersionsPresent: z.array(z.string().min(1)),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export const privateShareSnapshotPayloadSchema = z.discriminatedUnion("scope", [
  positiveOnlyPayloadSchema,
  selectedPeriodPayloadSchema,
  extendedPayloadSchema,
]);

export type PrivateShareSnapshotPayload = z.infer<typeof privateShareSnapshotPayloadSchema>;

export const shareSnapshotRecordSchema = z.object({
  id: z.string().min(1),
  scope: shareScopeSchema,
  window: shareWindowSchema,
  snapshotVersion: shareSnapshotVersionSchema,
  status: shareStatusSchema,
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
});

export type ShareSnapshotRecord = z.infer<typeof shareSnapshotRecordSchema>;

export const shareSnapshotPreviewResponseSchema = z.object({
  snapshotVersion: shareSnapshotVersionSchema,
  scope: shareScopeSchema,
  window: shareWindowSchema,
  expiration: shareExpirationDurationSchema,
  expiresAt: z.string().datetime(),
  payload: privateShareSnapshotPayloadSchema,
});

export type ShareSnapshotPreviewResponse = z.infer<typeof shareSnapshotPreviewResponseSchema>;

export const shareSnapshotCreateResponseSchema = z.object({
  share: shareSnapshotRecordSchema,
  /** Raw bearer token — returned once at creation only. Never listed again. */
  token: z.string().min(32),
  payload: privateShareSnapshotPayloadSchema,
});

export type ShareSnapshotCreateResponse = z.infer<typeof shareSnapshotCreateResponseSchema>;

export const shareSnapshotListResponseSchema = z.object({
  shares: z.array(shareSnapshotRecordSchema),
});

export type ShareSnapshotListResponse = z.infer<typeof shareSnapshotListResponseSchema>;

export const shareSnapshotResolveResponseSchema = z.object({
  payload: privateShareSnapshotPayloadSchema,
});

export type ShareSnapshotResolveResponse = z.infer<typeof shareSnapshotResolveResponseSchema>;

export const SHARE_EXPIRATION_MS: Record<ShareExpirationDuration, number> = {
  "1d": 1 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};
