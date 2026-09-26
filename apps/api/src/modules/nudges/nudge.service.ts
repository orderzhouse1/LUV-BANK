import {
  GENTLE_NUDGES_V1,
  nudgeCurrentResponseSchema,
  nudgeSummaryQuerySchema,
  suppressNudgeRequestSchema,
  type NudgeCurrentResponse,
  type NudgeSuppressionDuration,
  type SuppressNudgeRequest,
} from "@luv-bank/validation";
import type { ApiEnv } from "../../config/env";
import { AppError } from "../../errors/app-error";
import type { AuthRepository } from "../auth/auth.types";
import type { InsightService } from "../insights/insight.service";
import type { MomentRepository } from "../moments/moment.types";
import { eligibilityFromInsightSummary, evaluateGentleNudgesV1 } from "./gentle-nudges-v1";
import type { NudgeSuppressionRepository } from "./nudge.types";

const SUPPRESSION_MS: Record<NudgeSuppressionDuration, number> = {
  "1d": 1 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

function toSafeDto(payload: NudgeCurrentResponse): NudgeCurrentResponse {
  return nudgeCurrentResponseSchema.parse(payload);
}

export class NudgeService {
  constructor(
    private readonly env: ApiEnv,
    private readonly authRepo: AuthRepository,
    private readonly momentRepo: MomentRepository,
    private readonly insightService: InsightService,
    private readonly suppressionRepo: NudgeSuppressionRepository,
  ) {
    if (this.env.ACTIVE_NUDGE_RULESET !== GENTLE_NUDGES_V1) {
      throw new Error(`Unsupported ACTIVE_NUDGE_RULESET: ${this.env.ACTIVE_NUDGE_RULESET}`);
    }
  }

  private async requireActiveProfileId(userId: string): Promise<string> {
    const profile = await this.authRepo.findActiveProfileForUser(userId);
    if (!profile || profile.status !== "ACTIVE" || profile.archivedAt) {
      throw new AppError(
        400,
        "PROFILE_REQUIRED",
        "An active relationship profile is required before viewing nudges.",
      );
    }
    return profile.id;
  }

  async current(
    userId: string,
    rawQuery: unknown,
    generatedAt = new Date(),
  ): Promise<NudgeCurrentResponse> {
    const query = nudgeSummaryQuerySchema.parse(rawQuery);
    const profileId = await this.requireActiveProfileId(userId);

    const insight = await this.insightService.summarize(
      userId,
      { window: query.window },
      generatedAt,
    );
    const moments = await this.momentRepo.listAllForProfile(profileId);
    const scoringVersionsPresent = [
      ...new Set(moments.map((moment) => moment.scoringVersion)),
    ].sort();

    const eligibility = eligibilityFromInsightSummary(insight, scoringVersionsPresent);
    let nudge = evaluateGentleNudgesV1(eligibility);

    if (nudge) {
      const suppressed = await this.suppressionRepo.findActive(profileId, nudge.code, generatedAt);
      if (suppressed) {
        nudge = null;
      }
    }

    return toSafeDto({
      nudgeRulesetVersion: GENTLE_NUDGES_V1,
      selectedWindow: query.window,
      generatedAt: generatedAt.toISOString(),
      nudge,
    });
  }

  async suppress(userId: string, rawBody: unknown, now = new Date()): Promise<{ ok: true }> {
    const body = suppressNudgeRequestSchema.parse(rawBody) as SuppressNudgeRequest;
    const profileId = await this.requireActiveProfileId(userId);
    const suppressedUntil = new Date(now.getTime() + SUPPRESSION_MS[body.duration]);

    await this.suppressionRepo.upsert({
      relationshipId: profileId,
      nudgeCode: body.nudgeCode,
      suppressedUntil,
    });

    return { ok: true };
  }
}
