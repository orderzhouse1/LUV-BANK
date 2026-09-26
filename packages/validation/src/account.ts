import { z } from "zod";
import { localeSchema } from "./common";
import { momentKindSchema } from "./enums";
import { momentCategoryCodeSchema } from "./moments";
import { privateShareSnapshotPayloadSchema, shareScopeSchema, shareWindowSchema } from "./shares";
import { nudgeCodeSchema } from "./nudges";
import { reminderPurposeCodeSchema, reminderWeekdaySchema } from "./reminders";

export const LUV_BANK_DATA_EXPORT_V1 = "LUV_BANK_DATA_EXPORT_V1" as const;

export const currentPasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(128),
});

export type CurrentPasswordRequest = z.infer<typeof currentPasswordRequestSchema>;

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters.")
    .max(128, "Password must be at most 128 characters.")
    .refine((value) => value.trim().length > 0, {
      message: "Password cannot be empty or whitespace-only.",
    }),
});

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;

export const deleteAccountRequestSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  confirmationPhrase: z.literal("DELETE_MY_ACCOUNT"),
});

export type DeleteAccountRequest = z.infer<typeof deleteAccountRequestSchema>;

export const sessionSummarySchema = z.object({
  id: z.string().min(1),
  clientKind: z.string().nullable(),
  createdAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
  current: z.boolean(),
});

export type SessionSummary = z.infer<typeof sessionSummarySchema>;

export const sessionListResponseSchema = z.object({
  sessions: z.array(sessionSummarySchema),
});

export type SessionListResponse = z.infer<typeof sessionListResponseSchema>;

export const deletionSummaryResponseSchema = z.object({
  relationshipProfileCount: z.number().int().nonnegative(),
  momentCount: z.number().int().nonnegative(),
  noteCount: z.number().int().nonnegative(),
  nudgeSuppressionCount: z.number().int().nonnegative(),
  reminderPreferenceCount: z.number().int().nonnegative(),
  shareSnapshotCount: z.number().int().nonnegative(),
  activeShareCount: z.number().int().nonnegative(),
  sessionCount: z.number().int().nonnegative(),
  notes: z.array(z.string()),
});

export type DeletionSummaryResponse = z.infer<typeof deletionSummaryResponseSchema>;

export const dataExportSchema = z.object({
  exportVersion: z.literal(LUV_BANK_DATA_EXPORT_V1),
  generatedAt: z.string().datetime(),
  account: z.object({
    id: z.string(),
    email: z.string().email(),
    displayName: z.string(),
    preferredLocale: localeSchema,
    status: z.string(),
    acceptedTermsAt: z.string().datetime().nullable(),
    lastLoginAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    activeRelationshipProfileId: z.string().nullable(),
  }),
  relationshipProfiles: z.array(
    z.object({
      id: z.string(),
      privateName: z.string(),
      label: z.string().nullable(),
      partnerDisplayName: z.string().nullable(),
      relationshipStartDate: z.string().datetime().nullable(),
      status: z.string(),
      archivedAt: z.string().datetime().nullable(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
  moments: z.array(
    z.object({
      id: z.string(),
      relationshipProfileId: z.string(),
      kind: momentKindSchema,
      categoryCode: momentCategoryCodeSchema,
      note: z.string().nullable(),
      occurredAt: z.string().datetime(),
      scoreImpact: z.number().int(),
      scoringVersion: z.string(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
  nudgeSuppressions: z.array(
    z.object({
      relationshipProfileId: z.string(),
      nudgeRulesetVersion: z.string(),
      nudgeCode: nudgeCodeSchema,
      suppressedUntil: z.string().datetime(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
  reminderPreferences: z.array(
    z.object({
      relationshipProfileId: z.string(),
      enabled: z.boolean(),
      cadence: z.string(),
      purposeCode: reminderPurposeCodeSchema,
      weekday: reminderWeekdaySchema,
      localHour: z.number().int(),
      localMinute: z.number().int(),
      timezone: z.string(),
      nextDueAt: z.string().datetime().nullable(),
      snoozedUntil: z.string().datetime().nullable(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
  /** Phase 6 has no separate occurrence table; always empty in V1. */
  reminderOccurrences: z.array(z.unknown()),
  shareSnapshots: z.array(
    z.object({
      id: z.string(),
      relationshipProfileId: z.string(),
      snapshotVersion: z.string(),
      scope: shareScopeSchema,
      selectedWindow: shareWindowSchema,
      creatorLocale: localeSchema,
      payload: privateShareSnapshotPayloadSchema,
      expiresAt: z.string().datetime(),
      revokedAt: z.string().datetime().nullable(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    }),
  ),
  sessions: z.array(sessionSummarySchema),
});

export type DataExportV1 = z.infer<typeof dataExportSchema>;
