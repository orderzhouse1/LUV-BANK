import { z } from "zod";
import { localeSchema } from "./common";

export const apiErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "INVALID_CREDENTIALS",
  "UNAUTHENTICATED",
  "SESSION_EXPIRED",
  "CSRF_INVALID",
  "EMAIL_ALREADY_EXISTS",
  "FORBIDDEN",
  "PROFILE_NOT_FOUND",
  "PROFILE_REQUIRED",
  "MOMENT_NOT_FOUND",
  "INVALID_MOMENT_CATEGORY",
  "CATEGORY_KIND_MISMATCH",
  "INVALID_OCCURRED_AT",
  "IDEMPOTENCY_CONFLICT",
  "RATE_LIMITED",
  "NOT_FOUND",
  "INTERNAL_ERROR",
  "CONFLICT",
  "CURRENT_PASSWORD_INVALID",
  "SHARE_UNAVAILABLE",
  "SHARE_NOT_FOUND",
  "REMINDER_NOT_DUE",
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

/** Normalize email: trim + lowercase. Never applied to passwords. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .email()
  .transform((value) => normalizeEmail(value));

const passwordField = z
  .string()
  .min(12, "Password must be at least 12 characters.")
  .max(128, "Password must be at most 128 characters.")
  .refine((value) => value.trim().length > 0, {
    message: "Password cannot be empty or whitespace-only.",
  });

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: passwordField,
  displayName: z.string().trim().min(1).max(80),
  preferredLocale: localeSchema.optional(),
  acceptedTerms: z.literal(true),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const relationshipProfileSummarySchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  label: z.string().nullable(),
  partnerDisplayName: z.string().nullable(),
  startedAt: z.string().datetime().nullable(),
  status: z.enum(["ACTIVE", "ARCHIVED"]),
});

export type RelationshipProfileSummary = z.infer<typeof relationshipProfileSummarySchema>;

export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string(),
  preferredLocale: localeSchema,
  onboardingComplete: z.boolean(),
  activeRelationshipProfile: relationshipProfileSummarySchema.nullable(),
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const authSessionResponseSchema = z.object({
  user: authUserSchema,
});

export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;

export const refreshResponseSchema = z.object({
  ok: z.literal(true),
  userId: z.string().min(1),
});

export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export const csrfResponseSchema = z.object({
  csrfToken: z.string().min(1),
});

export type CsrfResponse = z.infer<typeof csrfResponseSchema>;

export const createRelationshipProfileRequestSchema = z.object({
  title: z.string().trim().min(1).max(80),
  label: z.string().trim().max(40).optional().nullable(),
  partnerDisplayName: z.string().trim().max(80).optional().nullable(),
  startedAt: z.string().datetime().optional().nullable(),
  preferredLocale: localeSchema.optional(),
});

export type CreateRelationshipProfileRequest = z.infer<
  typeof createRelationshipProfileRequestSchema
>;

export const updateRelationshipProfileRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(80).optional(),
    label: z.string().trim().max(40).optional().nullable(),
    partnerDisplayName: z.string().trim().max(80).optional().nullable(),
    startedAt: z.string().datetime().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export type UpdateRelationshipProfileRequest = z.infer<
  typeof updateRelationshipProfileRequestSchema
>;

export const relationshipProfileResponseSchema = z.object({
  profile: relationshipProfileSummarySchema,
});

export type RelationshipProfileResponse = z.infer<typeof relationshipProfileResponseSchema>;
