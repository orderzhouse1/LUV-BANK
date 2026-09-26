import {
  LUV_BANK_DATA_EXPORT_V1,
  dataExportSchema,
  deletionSummaryResponseSchema,
  sessionListResponseSchema,
  type ChangePasswordRequest,
  type CurrentPasswordRequest,
  type DataExportV1,
  type DeleteAccountRequest,
  type DeletionSummaryResponse,
  type SessionListResponse,
} from "@luv-bank/validation";
import type { ApiEnv } from "../../config/env";
import { AppError } from "../../errors/app-error";
import { hashPassword, verifyPassword } from "../../lib/crypto";
import type { AuthRepository, UserRecord } from "../auth/auth.types";
import type { MomentRepository } from "../moments/moment.types";
import type { NudgeSuppressionRepository } from "../nudges/nudge.types";
import type { ReminderPreferenceRepository } from "../reminders/reminder.types";
import type { ShareSnapshotRepository } from "../shares/share.types";

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export class AccountService {
  constructor(
    private readonly env: ApiEnv,
    private readonly authRepo: AuthRepository,
    private readonly momentRepo: MomentRepository,
    private readonly nudgeRepo: NudgeSuppressionRepository,
    private readonly reminderRepo: ReminderPreferenceRepository,
    private readonly shareRepo: ShareSnapshotRepository,
  ) {}

  async listSessions(userId: string, currentSessionId: string): Promise<SessionListResponse> {
    const sessions = await this.authRepo.listSessionsForUser(userId);
    return sessionListResponseSchema.parse({
      sessions: sessions.map((session) => ({
        id: session.id,
        clientKind: session.clientKind,
        createdAt: session.createdAt.toISOString(),
        lastUsedAt: iso(session.lastUsedAt),
        expiresAt: session.expiresAt.toISOString(),
        revokedAt: iso(session.revokedAt),
        current: session.id === currentSessionId,
      })),
    });
  }

  /**
   * Revokes a session owned by the user.
   * Returns whether the revoked session was the caller's current session.
   */
  async revokeSession(
    userId: string,
    currentSessionId: string,
    sessionId: string,
  ): Promise<{ revokedCurrent: boolean }> {
    const sessions = await this.authRepo.listSessionsForUser(userId);
    const target = sessions.find((session) => session.id === sessionId);
    if (!target) {
      throw new AppError(404, "NOT_FOUND", "Session not found.");
    }
    if (target.revokedAt) {
      return { revokedCurrent: target.id === currentSessionId };
    }
    await this.authRepo.revokeSession(sessionId, new Date());
    return { revokedCurrent: sessionId === currentSessionId };
  }

  async changePassword(user: UserRecord, input: ChangePasswordRequest): Promise<{ ok: true }> {
    await this.assertCurrentPassword(user, input.currentPassword);
    const nextHash = await hashPassword(input.newPassword);
    await this.authRepo.updatePasswordHash(user.id, nextHash);
    return { ok: true };
  }

  async exportPersonalData(
    user: UserRecord,
    currentSessionId: string,
    input: CurrentPasswordRequest,
  ): Promise<DataExportV1> {
    await this.assertCurrentPassword(user, input.currentPassword);

    const profiles = await this.authRepo.listProfilesForUser(user.id);
    const profileIds = profiles.map((profile) => profile.id);
    const [moments, suppressions, reminders, shares, sessions] = await Promise.all([
      this.momentRepo.listAllForProfiles(profileIds),
      this.nudgeRepo.listByRelationshipIds(profileIds),
      this.reminderRepo.listByRelationshipIds(profileIds),
      this.shareRepo.listByRelationshipIds(profileIds),
      this.authRepo.listSessionsForUser(user.id),
    ]);

    const exportPayload: DataExportV1 = {
      exportVersion: LUV_BANK_DATA_EXPORT_V1,
      generatedAt: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        preferredLocale: user.preferredLocale,
        status: user.status,
        acceptedTermsAt: iso(user.acceptedTermsAt),
        lastLoginAt: iso(user.lastLoginAt),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        activeRelationshipProfileId: user.activeRelationshipProfileId,
      },
      relationshipProfiles: profiles.map((profile) => ({
        id: profile.id,
        privateName: profile.title,
        label: profile.label,
        partnerDisplayName: profile.partnerDisplayName,
        relationshipStartDate: iso(profile.startedAt),
        status: profile.status,
        archivedAt: iso(profile.archivedAt),
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      })),
      moments: moments.map((moment) => ({
        id: moment.id,
        relationshipProfileId: moment.relationshipId,
        kind: moment.kind,
        categoryCode: moment.categoryCode,
        note: moment.note,
        occurredAt: moment.occurredAt.toISOString(),
        scoreImpact: moment.scoreImpact,
        scoringVersion: moment.scoringVersion,
        createdAt: moment.createdAt.toISOString(),
        updatedAt: moment.updatedAt.toISOString(),
      })),
      nudgeSuppressions: suppressions.map((row) => ({
        relationshipProfileId: row.relationshipId,
        nudgeRulesetVersion: this.env.ACTIVE_NUDGE_RULESET,
        nudgeCode: row.nudgeCode,
        suppressedUntil: row.suppressedUntil.toISOString(),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      reminderPreferences: reminders.map((row) => ({
        relationshipProfileId: row.relationshipId,
        enabled: row.enabled,
        cadence: row.cadence,
        purposeCode: row.purposeCode,
        weekday: row.weekday,
        localHour: row.localHour,
        localMinute: row.localMinute,
        timezone: row.timezone,
        nextDueAt: iso(row.nextDueAt),
        snoozedUntil: iso(row.snoozedUntil),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
      reminderOccurrences: [],
      shareSnapshots: shares.map((share) => ({
        id: share.id,
        relationshipProfileId: share.relationshipId,
        snapshotVersion: share.snapshotVersion,
        scope: share.scope,
        selectedWindow: share.window,
        creatorLocale: user.preferredLocale,
        payload: share.payload,
        expiresAt: share.expiresAt.toISOString(),
        revokedAt: iso(share.revokedAt),
        createdAt: share.createdAt.toISOString(),
        updatedAt: share.updatedAt.toISOString(),
      })),
      sessions: sessions.map((session) => ({
        id: session.id,
        clientKind: session.clientKind,
        createdAt: session.createdAt.toISOString(),
        lastUsedAt: iso(session.lastUsedAt),
        expiresAt: session.expiresAt.toISOString(),
        revokedAt: iso(session.revokedAt),
        current: session.id === currentSessionId,
      })),
    };

    return dataExportSchema.parse(exportPayload);
  }

  async deletionSummary(userId: string): Promise<DeletionSummaryResponse> {
    const profiles = await this.authRepo.listProfilesForUser(userId);
    const profileIds = profiles.map((profile) => profile.id);
    const [moments, suppressions, reminders, shares, sessions] = await Promise.all([
      this.momentRepo.listAllForProfiles(profileIds),
      this.nudgeRepo.listByRelationshipIds(profileIds),
      this.reminderRepo.listByRelationshipIds(profileIds),
      this.shareRepo.listByRelationshipIds(profileIds),
      this.authRepo.listSessionsForUser(userId),
    ]);

    const now = Date.now();
    const activeShareCount = shares.filter(
      (share) => !share.revokedAt && share.expiresAt.getTime() > now,
    ).length;
    const noteCount = moments.filter((moment) => Boolean(moment.note?.length)).length;
    const activeSessionCount = sessions.filter(
      (session) => !session.revokedAt && session.expiresAt.getTime() > now,
    ).length;

    return deletionSummaryResponseSchema.parse({
      relationshipProfileCount: profiles.length,
      momentCount: moments.length,
      noteCount,
      nudgeSuppressionCount: suppressions.length,
      reminderPreferenceCount: reminders.length,
      shareSnapshotCount: shares.length,
      activeShareCount,
      sessionCount: activeSessionCount,
      notes: [
        "Deletion is immediate and permanent after password confirmation.",
        "Your account, relationship profiles, moments, private notes, sessions, nudge suppressions, reminder preferences, and share snapshots are removed.",
        "Public share links become unavailable because snapshot records are deleted.",
        "There is no soft-delete tombstone and no delayed deletion queue.",
        "The same email may register again later as a new account.",
        "LUV BANK does not use Neon-hosted retention of your private application data after this deletion.",
        "Operational logs may keep non-identifying request metadata; they do not keep your notes, passwords, or export contents.",
      ],
    });
  }

  async revokeAllShares(userId: string): Promise<{ revokedCount: number }> {
    const profiles = await this.authRepo.listProfilesForUser(userId);
    const profileIds = profiles.map((profile) => profile.id);
    const revokedCount = await this.shareRepo.revokeAllActiveForProfiles(profileIds, new Date());
    return { revokedCount };
  }

  async hardDeleteShare(userId: string, shareId: string): Promise<{ ok: true }> {
    const profiles = await this.authRepo.listProfilesForUser(userId);
    const profileIds = profiles.map((profile) => profile.id);
    const deleted = await this.shareRepo.hardDelete(shareId, profileIds);
    if (!deleted) {
      throw new AppError(404, "SHARE_NOT_FOUND", "Share snapshot not found.");
    }
    return { ok: true };
  }

  async deleteAccount(user: UserRecord, input: DeleteAccountRequest): Promise<{ ok: true }> {
    await this.assertCurrentPassword(user, input.currentPassword);

    const profiles = await this.authRepo.listProfilesForUser(user.id);
    const profileIds = profiles.map((profile) => profile.id);

    await this.momentRepo.deleteAllForProfiles(profileIds);
    await this.nudgeRepo.deleteAllForProfiles(profileIds);
    await this.reminderRepo.deleteAllForProfiles(profileIds);
    await this.shareRepo.deleteAllForProfiles(profileIds);
    await this.authRepo.hardDeleteUser(user.id);

    return { ok: true };
  }

  private async assertCurrentPassword(user: UserRecord, currentPassword: string): Promise<void> {
    const valid = await verifyPassword(user.passwordHash, currentPassword);
    if (!valid) {
      throw new AppError(401, "CURRENT_PASSWORD_INVALID", "Current password is incorrect.");
    }
  }
}
