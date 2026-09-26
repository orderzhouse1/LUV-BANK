import {
  PRIVATE_SHARE_SNAPSHOT_V1,
  createShareSnapshotRequestSchema,
  previewShareSnapshotRequestSchema,
  privateShareSnapshotPayloadSchema,
  resolveShareSnapshotRequestSchema,
  shareSnapshotCreateResponseSchema,
  shareSnapshotListResponseSchema,
  shareSnapshotPreviewResponseSchema,
  shareSnapshotRecordSchema,
  shareSnapshotResolveResponseSchema,
  type AggregateMomentInput,
  type ShareSnapshotCreateResponse,
  type ShareSnapshotListResponse,
  type ShareSnapshotPreviewResponse,
  type ShareSnapshotResolveResponse,
  type ShareStatus,
} from "@luv-bank/validation";
import type { ApiEnv } from "../../config/env";
import { AppError } from "../../errors/app-error";
import { generateOpaqueToken, sha256 } from "../../lib/crypto";
import type { AuthRepository } from "../auth/auth.types";
import type { MomentRepository } from "../moments/moment.types";
import { buildPrivateShareSnapshotV1, computeShareExpiresAt } from "./share-snapshot-v1";
import type { ShareSnapshotRecord, ShareSnapshotRepository } from "./share.types";

function toAggregate(
  moments: Awaited<ReturnType<MomentRepository["listAllForProfile"]>>,
): AggregateMomentInput[] {
  return moments.map((m) => ({
    kind: m.kind,
    categoryCode: m.categoryCode,
    scoreImpact: m.scoreImpact,
    scoringVersion: m.scoringVersion,
    occurredAt: m.occurredAt,
  }));
}

function statusOf(row: ShareSnapshotRecord, now: Date): ShareStatus {
  if (row.revokedAt) return "REVOKED";
  if (row.expiresAt.getTime() <= now.getTime()) return "EXPIRED";
  return "ACTIVE";
}

function toShareDto(row: ShareSnapshotRecord, now: Date) {
  return shareSnapshotRecordSchema.parse({
    id: row.id,
    scope: row.scope,
    window: row.window,
    snapshotVersion: row.snapshotVersion,
    status: statusOf(row, now),
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
  });
}

function parseStoredPayload(row: ShareSnapshotRecord) {
  if (row.snapshotVersion !== PRIVATE_SHARE_SNAPSHOT_V1) {
    throw new AppError(404, "SHARE_UNAVAILABLE", "This share is unavailable.");
  }
  try {
    return privateShareSnapshotPayloadSchema.parse(row.payload);
  } catch {
    throw new AppError(404, "SHARE_UNAVAILABLE", "This share is unavailable.");
  }
}

export class ShareService {
  constructor(
    private readonly env: ApiEnv,
    private readonly authRepo: AuthRepository,
    private readonly momentRepo: MomentRepository,
    private readonly shareRepo: ShareSnapshotRepository,
  ) {
    if (this.env.ACTIVE_SHARE_SNAPSHOT_VERSION !== PRIVATE_SHARE_SNAPSHOT_V1) {
      throw new Error(
        `Unsupported ACTIVE_SHARE_SNAPSHOT_VERSION: ${this.env.ACTIVE_SHARE_SNAPSHOT_VERSION}`,
      );
    }
  }

  private async requireActiveProfile(userId: string) {
    const profile = await this.authRepo.findActiveProfileForUser(userId);
    if (!profile || profile.status !== "ACTIVE" || profile.archivedAt) {
      throw new AppError(
        400,
        "PROFILE_REQUIRED",
        "An active relationship profile is required before managing shares.",
      );
    }
    return profile;
  }

  async preview(
    userId: string,
    rawBody: unknown,
    now = new Date(),
  ): Promise<ShareSnapshotPreviewResponse> {
    const body = previewShareSnapshotRequestSchema.parse(rawBody);
    const profile = await this.requireActiveProfile(userId);
    const moments = toAggregate(await this.momentRepo.listAllForProfile(profile.id));
    const expiresAt = computeShareExpiresAt(now, body.expiration);
    const payload = buildPrivateShareSnapshotV1({
      scope: body.scope,
      window: body.window,
      moments,
      createdAt: now,
      expiresAt,
    });

    return shareSnapshotPreviewResponseSchema.parse({
      snapshotVersion: PRIVATE_SHARE_SNAPSHOT_V1,
      scope: body.scope,
      window: body.window,
      expiration: body.expiration,
      expiresAt: expiresAt.toISOString(),
      payload,
    });
  }

  async create(
    userId: string,
    rawBody: unknown,
    now = new Date(),
  ): Promise<ShareSnapshotCreateResponse> {
    const body = createShareSnapshotRequestSchema.parse(rawBody);
    const profile = await this.requireActiveProfile(userId);
    const moments = toAggregate(await this.momentRepo.listAllForProfile(profile.id));
    const expiresAt = computeShareExpiresAt(now, body.expiration);
    const payload = buildPrivateShareSnapshotV1({
      scope: body.scope,
      window: body.window,
      moments,
      createdAt: now,
      expiresAt,
    });

    const token = generateOpaqueToken(32);
    const tokenHash = sha256(token);

    const saved = await this.shareRepo.create({
      relationshipId: profile.id,
      createdById: userId,
      scope: body.scope,
      window: body.window,
      snapshotVersion: PRIVATE_SHARE_SNAPSHOT_V1,
      payload,
      tokenHash,
      expiresAt,
    });

    return shareSnapshotCreateResponseSchema.parse({
      share: toShareDto(saved, now),
      token,
      payload,
    });
  }

  async list(userId: string, now = new Date()): Promise<ShareSnapshotListResponse> {
    const profile = await this.requireActiveProfile(userId);
    const rows = await this.shareRepo.listByRelationshipId(profile.id);
    return shareSnapshotListResponseSchema.parse({
      shares: rows.map((row) => toShareDto(row, now)),
    });
  }

  async revoke(userId: string, shareId: string, now = new Date()) {
    const profile = await this.requireActiveProfile(userId);
    const revoked = await this.shareRepo.revoke(shareId, profile.id, now);
    if (!revoked) {
      throw new AppError(404, "SHARE_NOT_FOUND", "Share snapshot not found.");
    }
    return { share: toShareDto(revoked, now) };
  }

  async resolve(rawBody: unknown, now = new Date()): Promise<ShareSnapshotResolveResponse> {
    const body = resolveShareSnapshotRequestSchema.parse(rawBody);
    const tokenHash = sha256(body.token);
    const row = await this.shareRepo.findByTokenHash(tokenHash);
    if (!row || statusOf(row, now) !== "ACTIVE") {
      throw new AppError(404, "SHARE_UNAVAILABLE", "This share is unavailable.");
    }
    const payload = parseStoredPayload(row);
    return shareSnapshotResolveResponseSchema.parse({ payload });
  }
}
