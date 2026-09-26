import {
  categoryMatchesKind,
  createMomentRequestSchema,
  evaluateWithActiveScoringPolicy,
  momentListQuerySchema,
  updateMomentRequestSchema,
  type CreateMomentRequest,
  type MomentListQuery,
  type MomentResponse,
  type PaginatedMomentsResponse,
  type UpdateMomentRequest,
} from "@luv-bank/validation";
import { AppError } from "../../errors/app-error";
import type { AuthRepository } from "../auth/auth.types";
import type { MomentRepository } from "./moment.types";
import { momentPayloadFingerprint, toMomentResponse } from "./moment.types";

const FUTURE_SKEW_MS = 5 * 60 * 1000;

function parseOccurredAt(value: string | undefined, now = new Date()): Date {
  if (!value) {
    return now;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, "INVALID_OCCURRED_AT", "Invalid occurrence time.");
  }
  if (date.getTime() > now.getTime() + FUTURE_SKEW_MS) {
    throw new AppError(400, "INVALID_OCCURRED_AT", "Occurrence time cannot be in the future.");
  }
  return date;
}

export class MomentService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly momentRepo: MomentRepository,
  ) {}

  private async requireActiveProfileId(userId: string): Promise<string> {
    const profile = await this.authRepo.findActiveProfileForUser(userId);
    if (!profile || profile.status !== "ACTIVE" || profile.archivedAt) {
      throw new AppError(
        400,
        "PROFILE_REQUIRED",
        "An active relationship profile is required before recording moments.",
      );
    }
    return profile.id;
  }

  async create(
    userId: string,
    raw: CreateMomentRequest,
  ): Promise<{ moment: MomentResponse; created: boolean }> {
    const input = createMomentRequestSchema.parse(raw);
    if (!categoryMatchesKind(input.kind, input.categoryCode)) {
      throw new AppError(400, "CATEGORY_KIND_MISMATCH", "Category does not match moment kind.");
    }
    const profileId = await this.requireActiveProfileId(userId);
    const occurredAt = parseOccurredAt(input.occurredAt);
    const note = input.note === undefined ? null : input.note;
    const payloadFingerprint = momentPayloadFingerprint({
      kind: input.kind,
      categoryCode: input.categoryCode,
      note,
      clientOccurredAt: input.occurredAt ?? null,
    });
    const scored = evaluateWithActiveScoringPolicy(input.kind, input.categoryCode);

    try {
      const result = await this.momentRepo.create({
        relationshipId: profileId,
        kind: input.kind,
        categoryCode: input.categoryCode,
        note,
        occurredAt,
        clientMutationId: input.clientMutationId,
        payloadFingerprint,
        scoreImpact: scored.scoreImpact,
        scoringVersion: scored.scoringVersion,
      });
      return { moment: toMomentResponse(result.moment), created: result.created };
    } catch (error) {
      if (error instanceof Error && error.message === "IDEMPOTENCY_CONFLICT") {
        throw new AppError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "This mutation ID was already used with a different payload.",
        );
      }
      throw error;
    }
  }

  async list(userId: string, query: MomentListQuery): Promise<PaginatedMomentsResponse> {
    const parsed = momentListQuerySchema.parse(query);
    const profileId = await this.requireActiveProfileId(userId);
    const cursor = parsed.cursor;
    try {
      const result = await this.momentRepo.list({
        relationshipId: profileId,
        kind: parsed.kind,
        categoryCode: parsed.categoryCode,
        from: parsed.from ? new Date(parsed.from) : undefined,
        to: parsed.to ? new Date(parsed.to) : undefined,
        cursor,
        limit: parsed.limit,
      });
      return {
        items: result.items.map(toMomentResponse),
        nextCursor: result.nextCursor,
      };
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_CURSOR") {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid pagination cursor.");
      }
      throw error;
    }
  }

  async get(userId: string, momentId: string): Promise<MomentResponse> {
    const profileId = await this.requireActiveProfileId(userId);
    const moment = await this.momentRepo.findByIdForProfile(profileId, momentId);
    if (!moment) {
      throw new AppError(404, "MOMENT_NOT_FOUND", "Moment not found.");
    }
    return toMomentResponse(moment);
  }

  async update(
    userId: string,
    momentId: string,
    raw: UpdateMomentRequest,
  ): Promise<MomentResponse> {
    const input = updateMomentRequestSchema.parse(raw);
    const profileId = await this.requireActiveProfileId(userId);
    const existing = await this.momentRepo.findByIdForProfile(profileId, momentId);
    if (!existing) {
      throw new AppError(404, "MOMENT_NOT_FOUND", "Moment not found.");
    }

    const nextKind = input.kind ?? existing.kind;
    const nextCategory = input.categoryCode ?? existing.categoryCode;
    if (!categoryMatchesKind(nextKind, nextCategory)) {
      throw new AppError(400, "CATEGORY_KIND_MISMATCH", "Category does not match moment kind.");
    }

    const occurredAt =
      input.occurredAt === undefined ? undefined : parseOccurredAt(input.occurredAt);

    const kindOrCategoryChanged =
      (input.kind !== undefined && input.kind !== existing.kind) ||
      (input.categoryCode !== undefined && input.categoryCode !== existing.categoryCode);

    let scoreImpact: number | undefined;
    let scoringVersion: string | undefined;
    if (kindOrCategoryChanged) {
      const scored = evaluateWithActiveScoringPolicy(nextKind, nextCategory);
      scoreImpact = scored.scoreImpact;
      scoringVersion = scored.scoringVersion;
    }

    const updated = await this.momentRepo.update(profileId, momentId, {
      kind: input.kind,
      categoryCode: input.categoryCode,
      note: input.note,
      occurredAt,
      scoreImpact,
      scoringVersion,
    });
    if (!updated) {
      throw new AppError(404, "MOMENT_NOT_FOUND", "Moment not found.");
    }
    return toMomentResponse(updated);
  }

  async remove(userId: string, momentId: string): Promise<void> {
    const profileId = await this.requireActiveProfileId(userId);
    const deleted = await this.momentRepo.delete(profileId, momentId);
    if (!deleted) {
      throw new AppError(404, "MOMENT_NOT_FOUND", "Moment not found.");
    }
  }
}
