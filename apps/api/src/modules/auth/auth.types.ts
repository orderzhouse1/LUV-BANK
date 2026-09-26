import type {
  AuthUser,
  CreateRelationshipProfileRequest,
  RelationshipProfileSummary,
  UpdateRelationshipProfileRequest,
} from "@luv-bank/validation";

export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  preferredLocale: "en" | "ar";
  status: "ACTIVE" | "DISABLED";
  acceptedTermsAt: Date | null;
  lastLoginAt: Date | null;
  activeRelationshipProfileId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type SessionRecord = {
  id: string;
  userId: string;
  familyId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBySessionId: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  clientKind: string | null;
};

export type ProfileRecord = {
  id: string;
  ownerId: string;
  title: string;
  label: string | null;
  partnerDisplayName: string | null;
  startedAt: Date | null;
  status: "ACTIVE" | "ARCHIVED";
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthRepository = {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  createUser(input: {
    email: string;
    passwordHash: string;
    displayName: string;
    preferredLocale: "en" | "ar";
    acceptedTermsAt: Date;
  }): Promise<UserRecord>;
  updateUserLastLogin(userId: string, at: Date): Promise<void>;
  updateUserPreferredLocale(userId: string, locale: "en" | "ar"): Promise<void>;
  setActiveRelationshipProfile(userId: string, profileId: string): Promise<void>;
  createSession(
    input: Omit<SessionRecord, "createdAt" | "lastUsedAt" | "revokedAt" | "replacedBySessionId"> & {
      revokedAt?: Date | null;
      replacedBySessionId?: string | null;
      lastUsedAt?: Date | null;
    },
  ): Promise<SessionRecord>;
  findSessionById(id: string): Promise<SessionRecord | null>;
  findSessionByRefreshHash(hash: string): Promise<SessionRecord | null>;
  markSessionReplaced(input: {
    sessionId: string;
    replacedBySessionId: string;
    revokedAt: Date;
  }): Promise<void>;
  revokeSession(sessionId: string, revokedAt: Date): Promise<void>;
  revokeFamily(familyId: string, revokedAt: Date): Promise<number>;
  revokeAllUserSessions(userId: string, revokedAt: Date): Promise<number>;
  touchSession(sessionId: string, at: Date): Promise<void>;
  listSessionsForUser(userId: string): Promise<SessionRecord[]>;
  updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
  listProfilesForUser(userId: string): Promise<ProfileRecord[]>;
  /** Hard-delete user, sessions, and owned profiles from the auth store. */
  hardDeleteUser(userId: string): Promise<void>;
  findProfileById(profileId: string): Promise<ProfileRecord | null>;
  findActiveProfileForUser(userId: string): Promise<ProfileRecord | null>;
  countActiveProfilesForUser(userId: string): Promise<number>;
  createProfileAndActivate(input: {
    userId: string;
    title: string;
    label: string | null;
    partnerDisplayName: string | null;
    startedAt: Date | null;
    preferredLocale?: "en" | "ar";
  }): Promise<ProfileRecord>;
  updateOwnedProfile(
    userId: string,
    profileId: string,
    patch: UpdateRelationshipProfileRequest,
  ): Promise<ProfileRecord | null>;
};

export function toProfileSummary(profile: ProfileRecord): RelationshipProfileSummary {
  return {
    id: profile.id,
    title: profile.title,
    label: profile.label,
    partnerDisplayName: profile.partnerDisplayName,
    startedAt: profile.startedAt ? profile.startedAt.toISOString() : null,
    status: profile.status,
  };
}

export function toAuthUser(user: UserRecord, profile: ProfileRecord | null): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    preferredLocale: user.preferredLocale,
    onboardingComplete: Boolean(user.activeRelationshipProfileId && profile),
    activeRelationshipProfile: profile ? toProfileSummary(profile) : null,
  };
}

export type { CreateRelationshipProfileRequest, UpdateRelationshipProfileRequest };
