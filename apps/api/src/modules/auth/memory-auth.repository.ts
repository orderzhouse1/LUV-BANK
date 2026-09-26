import { randomUUID } from "node:crypto";
import type { AuthRepository, ProfileRecord, SessionRecord, UserRecord } from "./auth.types";
import type { UpdateRelationshipProfileRequest } from "@luv-bank/validation";

export function createMemoryAuthRepository(): AuthRepository {
  const users = new Map<string, UserRecord>();
  const usersByEmail = new Map<string, string>();
  const sessions = new Map<string, SessionRecord>();
  const sessionsByHash = new Map<string, string>();
  const profiles = new Map<string, ProfileRecord>();

  return {
    async findUserByEmail(email) {
      const id = usersByEmail.get(email);
      return id ? (users.get(id) ?? null) : null;
    },

    async findUserById(id) {
      return users.get(id) ?? null;
    },

    async createUser(input) {
      const existing = usersByEmail.get(input.email);
      if (existing) {
        const error = new Error("EMAIL_ALREADY_EXISTS");
        error.name = "ConflictError";
        throw error;
      }
      const now = new Date();
      const user: UserRecord = {
        id: randomUUID(),
        email: input.email,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
        preferredLocale: input.preferredLocale,
        status: "ACTIVE",
        acceptedTermsAt: input.acceptedTermsAt,
        lastLoginAt: null,
        activeRelationshipProfileId: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      users.set(user.id, user);
      usersByEmail.set(user.email, user.id);
      return user;
    },

    async updateUserLastLogin(userId, at) {
      const user = users.get(userId);
      if (!user) return;
      users.set(userId, { ...user, lastLoginAt: at, updatedAt: at });
    },

    async updateUserPreferredLocale(userId, locale) {
      const user = users.get(userId);
      if (!user) return;
      users.set(userId, { ...user, preferredLocale: locale, updatedAt: new Date() });
    },

    async setActiveRelationshipProfile(userId, profileId) {
      const user = users.get(userId);
      if (!user) return;
      users.set(userId, {
        ...user,
        activeRelationshipProfileId: profileId,
        updatedAt: new Date(),
      });
    },

    async createSession(input) {
      const now = new Date();
      const session: SessionRecord = {
        id: input.id,
        userId: input.userId,
        familyId: input.familyId,
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
        revokedAt: input.revokedAt ?? null,
        replacedBySessionId: input.replacedBySessionId ?? null,
        createdAt: now,
        lastUsedAt: input.lastUsedAt ?? now,
        clientKind: input.clientKind ?? null,
      };
      sessions.set(session.id, session);
      sessionsByHash.set(session.refreshTokenHash, session.id);
      return session;
    },

    async findSessionById(id) {
      return sessions.get(id) ?? null;
    },

    async findSessionByRefreshHash(hash) {
      const id = sessionsByHash.get(hash);
      return id ? (sessions.get(id) ?? null) : null;
    },

    async markSessionReplaced(input) {
      const session = sessions.get(input.sessionId);
      if (!session) return;
      sessions.set(input.sessionId, {
        ...session,
        revokedAt: input.revokedAt,
        replacedBySessionId: input.replacedBySessionId,
      });
    },

    async revokeSession(sessionId, revokedAt) {
      const session = sessions.get(sessionId);
      if (!session) return;
      sessions.set(sessionId, { ...session, revokedAt });
    },

    async revokeFamily(familyId, revokedAt) {
      let count = 0;
      for (const [id, session] of sessions) {
        if (session.familyId === familyId && !session.revokedAt) {
          sessions.set(id, { ...session, revokedAt });
          count += 1;
        }
      }
      return count;
    },

    async revokeAllUserSessions(userId, revokedAt) {
      let count = 0;
      for (const [id, session] of sessions) {
        if (session.userId === userId && !session.revokedAt) {
          sessions.set(id, { ...session, revokedAt });
          count += 1;
        }
      }
      return count;
    },

    async touchSession(sessionId, at) {
      const session = sessions.get(sessionId);
      if (!session) return;
      sessions.set(sessionId, { ...session, lastUsedAt: at });
    },

    async listSessionsForUser(userId) {
      return [...sessions.values()]
        .filter((session) => session.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((session) => ({ ...session }));
    },

    async updatePasswordHash(userId, passwordHash) {
      const user = users.get(userId);
      if (!user) return;
      users.set(userId, { ...user, passwordHash, updatedAt: new Date() });
    },

    async listProfilesForUser(userId) {
      return [...profiles.values()]
        .filter((profile) => profile.ownerId === userId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((profile) => ({ ...profile }));
    },

    async hardDeleteUser(userId) {
      const user = users.get(userId);
      if (!user) return;
      usersByEmail.delete(user.email);
      users.delete(userId);
      for (const [id, session] of sessions) {
        if (session.userId === userId) {
          sessionsByHash.delete(session.refreshTokenHash);
          sessions.delete(id);
        }
      }
      for (const [id, profile] of profiles) {
        if (profile.ownerId === userId) {
          profiles.delete(id);
        }
      }
    },

    async findProfileById(profileId) {
      return profiles.get(profileId) ?? null;
    },

    async findActiveProfileForUser(userId) {
      const user = users.get(userId);
      if (!user?.activeRelationshipProfileId) return null;
      const profile = profiles.get(user.activeRelationshipProfileId);
      if (!profile || profile.ownerId !== userId) return null;
      return profile;
    },

    async countActiveProfilesForUser(userId) {
      let count = 0;
      for (const profile of profiles.values()) {
        if (profile.ownerId === userId && profile.status === "ACTIVE" && !profile.archivedAt) {
          count += 1;
        }
      }
      return count;
    },

    async createProfileAndActivate(input) {
      const user = users.get(input.userId);
      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }
      if (user.activeRelationshipProfileId) {
        const existing = profiles.get(user.activeRelationshipProfileId);
        if (existing && existing.ownerId === input.userId) {
          return existing;
        }
      }

      const now = new Date();
      const profile: ProfileRecord = {
        id: randomUUID(),
        ownerId: input.userId,
        title: input.title,
        label: input.label,
        partnerDisplayName: input.partnerDisplayName,
        startedAt: input.startedAt,
        status: "ACTIVE",
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      profiles.set(profile.id, profile);
      users.set(input.userId, {
        ...user,
        activeRelationshipProfileId: profile.id,
        preferredLocale: input.preferredLocale ?? user.preferredLocale,
        updatedAt: now,
      });
      return profile;
    },

    async updateOwnedProfile(userId, profileId, patch: UpdateRelationshipProfileRequest) {
      const profile = profiles.get(profileId);
      if (!profile || profile.ownerId !== userId) {
        return null;
      }
      const next: ProfileRecord = {
        ...profile,
        title: patch.title ?? profile.title,
        label: patch.label === undefined ? profile.label : patch.label,
        partnerDisplayName:
          patch.partnerDisplayName === undefined
            ? profile.partnerDisplayName
            : patch.partnerDisplayName,
        startedAt:
          patch.startedAt === undefined
            ? profile.startedAt
            : patch.startedAt
              ? new Date(patch.startedAt)
              : null,
        updatedAt: new Date(),
      };
      profiles.set(profileId, next);
      return next;
    },
  };
}
