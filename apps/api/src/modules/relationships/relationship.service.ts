import type {
  CreateRelationshipProfileRequest,
  RelationshipProfileResponse,
  UpdateRelationshipProfileRequest,
} from "@luv-bank/validation";
import { AppError } from "../../errors/app-error";
import type { AuthRepository } from "../auth/auth.types";
import { toProfileSummary } from "../auth/auth.types";

export class RelationshipService {
  constructor(private readonly repo: AuthRepository) {}

  async getActive(userId: string): Promise<RelationshipProfileResponse> {
    const profile = await this.repo.findActiveProfileForUser(userId);
    if (!profile) {
      throw new AppError(404, "PROFILE_NOT_FOUND", "No active relationship profile found.");
    }
    return { profile: toProfileSummary(profile) };
  }

  async create(
    userId: string,
    input: CreateRelationshipProfileRequest,
  ): Promise<RelationshipProfileResponse> {
    // Idempotent: if an active profile already exists, return it instead of creating another.
    const existing = await this.repo.findActiveProfileForUser(userId);
    if (existing) {
      return { profile: toProfileSummary(existing) };
    }

    const profile = await this.repo.createProfileAndActivate({
      userId,
      title: input.title,
      label: input.label ?? null,
      partnerDisplayName: input.partnerDisplayName ?? null,
      startedAt: input.startedAt ? new Date(input.startedAt) : null,
      preferredLocale: input.preferredLocale,
    });

    return { profile: toProfileSummary(profile) };
  }

  async update(
    userId: string,
    profileId: string,
    input: UpdateRelationshipProfileRequest,
  ): Promise<RelationshipProfileResponse> {
    const profile = await this.repo.updateOwnedProfile(userId, profileId, input);
    if (!profile) {
      throw new AppError(404, "PROFILE_NOT_FOUND", "Relationship profile not found.");
    }
    return { profile: toProfileSummary(profile) };
  }
}
