import { z } from "zod";
import { momentKindSchema } from "./enums";

export const POSITIVE_CATEGORY_CODES = [
  "AFFECTION",
  "APPRECIATION",
  "QUALITY_TIME",
  "SUPPORT",
  "SHARED_JOY",
  "THOUGHTFUL_GESTURE",
] as const;

export const DIFFICULT_CATEGORY_CODES = [
  "TENSION",
  "FELT_UNHEARD",
  "FELT_OVERLOOKED",
  "ARGUMENT",
  "EMOTIONAL_DISTANCE",
  "HARSH_EXCHANGE",
] as const;

export const ALL_CATEGORY_CODES = [
  ...POSITIVE_CATEGORY_CODES,
  ...DIFFICULT_CATEGORY_CODES,
] as const;

export type PositiveCategoryCode = (typeof POSITIVE_CATEGORY_CODES)[number];
export type DifficultCategoryCode = (typeof DIFFICULT_CATEGORY_CODES)[number];
export type MomentCategoryCode = (typeof ALL_CATEGORY_CODES)[number];

export const positiveCategoryCodeSchema = z.enum(POSITIVE_CATEGORY_CODES);
export const difficultCategoryCodeSchema = z.enum(DIFFICULT_CATEGORY_CODES);
export const momentCategoryCodeSchema = z.enum(ALL_CATEGORY_CODES);

export function categoryMatchesKind(
  kind: z.infer<typeof momentKindSchema>,
  categoryCode: MomentCategoryCode,
): boolean {
  if (kind === "POSITIVE") {
    return (POSITIVE_CATEGORY_CODES as readonly string[]).includes(categoryCode);
  }
  return (DIFFICULT_CATEGORY_CODES as readonly string[]).includes(categoryCode);
}

const CONTROL_EXCEPTIONS = new Set(["\n", "\r", "\t"]);

export function isSafePlainNote(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code === 0) {
      return false;
    }
    if (code < 32 && !CONTROL_EXCEPTIONS.has(char)) {
      return false;
    }
  }
  return true;
}

export function unicodeLength(value: string): number {
  return [...value].length;
}

export const momentNoteSchema = z
  .string()
  .refine((value) => unicodeLength(value) <= 500, {
    message: "Note must be at most 500 characters.",
  })
  .refine((value) => isSafePlainNote(value), {
    message: "Note contains unsupported control characters.",
  })
  .transform((value) => {
    // Empty note normalizes to null; intentional internal spacing is preserved.
    return value.length === 0 ? null : value;
  });

export const optionalMomentNoteSchema = z
  .union([momentNoteSchema, z.null(), z.undefined()])
  .transform((value) => {
    if (value === undefined || value === null || value === "") {
      return null;
    }
    return value;
  });

export const clientMutationIdSchema = z.string().uuid();

export const createMomentRequestSchema = z
  .object({
    kind: momentKindSchema,
    categoryCode: momentCategoryCodeSchema,
    note: optionalMomentNoteSchema.optional(),
    occurredAt: z.string().datetime().optional(),
    clientMutationId: clientMutationIdSchema,
  })
  .superRefine((value, ctx) => {
    if (!categoryMatchesKind(value.kind, value.categoryCode)) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryCode"],
        message: "Category does not match moment kind.",
      });
    }
  });

export type CreateMomentRequest = z.infer<typeof createMomentRequestSchema>;

export const updateMomentRequestSchema = z
  .object({
    kind: momentKindSchema.optional(),
    categoryCode: momentCategoryCodeSchema.optional(),
    note: optionalMomentNoteSchema.optional(),
    occurredAt: z.string().datetime().optional(),
  })
  .refine(
    (value) =>
      value.kind !== undefined ||
      value.categoryCode !== undefined ||
      value.note !== undefined ||
      value.occurredAt !== undefined,
    { message: "At least one field is required." },
  );

export type UpdateMomentRequest = z.infer<typeof updateMomentRequestSchema>;

export const momentResponseSchema = z.object({
  id: z.string().min(1),
  kind: momentKindSchema,
  categoryCode: momentCategoryCodeSchema,
  note: z.string().nullable(),
  occurredAt: z.string().datetime(),
  scoreImpact: z.number().int(),
  scoringVersion: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type MomentResponse = z.infer<typeof momentResponseSchema>;

export const momentListQuerySchema = z
  .object({
    kind: momentKindSchema.optional(),
    categoryCode: momentCategoryCodeSchema.optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .superRefine((value, ctx) => {
    if (value.from && value.to && new Date(value.from) > new Date(value.to)) {
      ctx.addIssue({
        code: "custom",
        path: ["from"],
        message: "from must not be after to.",
      });
    }
    if (value.kind && value.categoryCode && !categoryMatchesKind(value.kind, value.categoryCode)) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryCode"],
        message: "Category does not match moment kind.",
      });
    }
  });

export type MomentListQuery = z.infer<typeof momentListQuerySchema>;

export const paginatedMomentsResponseSchema = z.object({
  items: z.array(momentResponseSchema),
  nextCursor: z.string().nullable(),
});

export type PaginatedMomentsResponse = z.infer<typeof paginatedMomentsResponseSchema>;

export const momentSingleResponseSchema = z.object({
  moment: momentResponseSchema,
});

export type MomentSingleResponse = z.infer<typeof momentSingleResponseSchema>;
