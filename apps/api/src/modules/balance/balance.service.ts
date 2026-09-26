import {
  ACTIVE_SCORING_VERSION,
  balanceSummaryQuerySchema,
  balanceSummaryResponseSchema,
  type BalanceSummaryResponse,
  type BalanceWindow,
  type LifetimeContribution,
  type PeriodContribution,
} from "@luv-bank/validation";
import { AppError } from "../../errors/app-error";
import type { AuthRepository } from "../auth/auth.types";
import type { MomentRecord, MomentRepository } from "../moments/moment.types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const WINDOW_DAYS: Record<Exclude<BalanceWindow, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function sumContributions(
  moments: MomentRecord[],
): Omit<LifetimeContribution, never> & LifetimeContribution {
  let positiveContribution = 0;
  let difficultContribution = 0;
  let netBalance = 0;
  for (const moment of moments) {
    netBalance += moment.scoreImpact;
    if (moment.scoreImpact > 0) {
      positiveContribution += moment.scoreImpact;
    } else if (moment.scoreImpact < 0) {
      difficultContribution += Math.abs(moment.scoreImpact);
    }
  }
  return {
    positiveContribution,
    difficultContribution,
    netBalance,
    totalMoments: moments.length,
  };
}

/** Half-open (start, end] in UTC. */
function inWindow(moment: MomentRecord, start: Date, end: Date): boolean {
  const t = moment.occurredAt.getTime();
  return t > start.getTime() && t <= end.getTime();
}

function periodFrom(moments: MomentRecord[], start: Date, end: Date): PeriodContribution {
  const inRange = moments.filter((m) => inWindow(m, start, end));
  return {
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    ...sumContributions(inRange),
  };
}

export class BalanceService {
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
        "An active relationship profile is required before viewing balance.",
      );
    }
    return profile.id;
  }

  async summarize(
    userId: string,
    rawQuery: unknown,
    now = new Date(),
  ): Promise<BalanceSummaryResponse> {
    const query = balanceSummaryQuerySchema.parse(rawQuery);
    const profileId = await this.requireActiveProfileId(userId);
    const moments = await this.momentRepo.listAllForProfile(profileId);
    const lifetime = sumContributions(moments);

    let currentPeriod: PeriodContribution;
    let previousPeriod: PeriodContribution | null;
    let changeFromPrevious: { netBalance: number } | null;

    if (query.window === "all") {
      currentPeriod = {
        startsAt: null,
        endsAt: now.toISOString(),
        ...lifetime,
      };
      previousPeriod = null;
      changeFromPrevious = null;
    } else {
      const days = WINDOW_DAYS[query.window];
      const currentEnd = now;
      const currentStart = new Date(now.getTime() - days * MS_PER_DAY);
      const previousEnd = currentStart;
      const previousStart = new Date(currentStart.getTime() - days * MS_PER_DAY);

      currentPeriod = periodFrom(moments, currentStart, currentEnd);
      previousPeriod = periodFrom(moments, previousStart, previousEnd);
      changeFromPrevious = {
        netBalance: currentPeriod.netBalance - previousPeriod.netBalance,
      };
    }

    return balanceSummaryResponseSchema.parse({
      scoringVersion: ACTIVE_SCORING_VERSION,
      selectedWindow: query.window,
      generatedAt: now.toISOString(),
      lifetime,
      currentPeriod,
      previousPeriod,
      changeFromPrevious,
    });
  }
}
