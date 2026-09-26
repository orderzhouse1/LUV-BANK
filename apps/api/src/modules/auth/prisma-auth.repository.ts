import type { PrismaClient } from "@luv-bank/database";
import type { UpdateRelationshipProfileRequest } from "@luv-bank/validation";
import { randomUUID } from "node:crypto";
import type { AuthRepository, ProfileRecord, SessionRecord, UserRecord } from "./auth.types";

function mapUser(user: {
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
}): UserRecord {
  return user;
}

function mapSession(session: {
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
}): SessionRecord {
  return session;
}

function mapProfile(profile: {
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
}): ProfileRecord {
  return profile;
}

export function createPrismaAuthRepository(prisma: PrismaClient): AuthRepository {
  return {
    async findUserByEmail(email) {
      const user = await prisma.user.findUnique({ where: { email } });
      return user ? mapUser(user) : null;
    },

    async findUserById(id) {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ? mapUser(user) : null;
    },

    async createUser(input) {
      try {
        const user = await prisma.user.create({
          data: {
            email: input.email,
            passwordHash: input.passwordHash,
            displayName: input.displayName,
            preferredLocale: input.preferredLocale,
            acceptedTermsAt: input.acceptedTermsAt,
          },
        });
        return mapUser(user);
      } catch (error) {
        if (
          typeof error === "object" &&
          error &&
          "code" in error &&
          (error as { code?: string }).code === "P2002"
        ) {
          const conflict = new Error("EMAIL_ALREADY_EXISTS");
          conflict.name = "ConflictError";
          throw conflict;
        }
        throw error;
      }
    },

    async updateUserLastLogin(userId, at) {
      await prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: at },
      });
    },

    async updateUserPreferredLocale(userId, locale) {
      await prisma.user.update({
        where: { id: userId },
        data: { preferredLocale: locale },
      });
    },

    async setActiveRelationshipProfile(userId, profileId) {
      await prisma.user.update({
        where: { id: userId },
        data: { activeRelationshipProfileId: profileId },
      });
    },

    async createSession(input) {
      const session = await prisma.authSession.create({
        data: {
          id: input.id,
          userId: input.userId,
          familyId: input.familyId,
          refreshTokenHash: input.refreshTokenHash,
          expiresAt: input.expiresAt,
          revokedAt: input.revokedAt ?? null,
          replacedBySessionId: input.replacedBySessionId ?? null,
          lastUsedAt: input.lastUsedAt ?? new Date(),
          clientKind: input.clientKind ?? null,
        },
      });
      return mapSession(session);
    },

    async findSessionById(id) {
      const session = await prisma.authSession.findUnique({ where: { id } });
      return session ? mapSession(session) : null;
    },

    async findSessionByRefreshHash(hash) {
      const session = await prisma.authSession.findUnique({
        where: { refreshTokenHash: hash },
      });
      return session ? mapSession(session) : null;
    },

    async markSessionReplaced(input) {
      await prisma.authSession.update({
        where: { id: input.sessionId },
        data: {
          revokedAt: input.revokedAt,
          replacedBySessionId: input.replacedBySessionId,
        },
      });
    },

    async revokeSession(sessionId, revokedAt) {
      await prisma.authSession.update({
        where: { id: sessionId },
        data: { revokedAt },
      });
    },

    async revokeFamily(familyId, revokedAt) {
      const result = await prisma.authSession.updateMany({
        where: { familyId, revokedAt: null },
        data: { revokedAt },
      });
      return result.count;
    },

    async revokeAllUserSessions(userId, revokedAt) {
      const result = await prisma.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt },
      });
      return result.count;
    },

    async touchSession(sessionId, at) {
      await prisma.authSession.update({
        where: { id: sessionId },
        data: { lastUsedAt: at },
      });
    },

    async listSessionsForUser(userId) {
      const rows = await prisma.authSession.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(mapSession);
    },

    async updatePasswordHash(userId, passwordHash) {
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
    },

    async listProfilesForUser(userId) {
      const rows = await prisma.relationshipProfile.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(mapProfile);
    },

    async hardDeleteUser(userId) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { activeRelationshipProfileId: null },
        });
        await tx.relationshipProfile.deleteMany({ where: { ownerId: userId } });
        await tx.authSession.deleteMany({ where: { userId } });
        await tx.user.delete({ where: { id: userId } });
      });
    },

    async findProfileById(profileId) {
      const profile = await prisma.relationshipProfile.findUnique({ where: { id: profileId } });
      return profile ? mapProfile(profile) : null;
    },

    async findActiveProfileForUser(userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { activeRelationshipProfile: true },
      });
      const profile = user?.activeRelationshipProfile;
      if (!profile || profile.ownerId !== userId) {
        return null;
      }
      return mapProfile(profile);
    },

    async countActiveProfilesForUser(userId) {
      return prisma.relationshipProfile.count({
        where: { ownerId: userId, status: "ACTIVE", archivedAt: null },
      });
    },

    async createProfileAndActivate(input) {
      return prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: input.userId } });
        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }
        if (user.activeRelationshipProfileId) {
          const existing = await tx.relationshipProfile.findUnique({
            where: { id: user.activeRelationshipProfileId },
          });
          if (existing && existing.ownerId === input.userId) {
            return mapProfile(existing);
          }
        }

        const profile = await tx.relationshipProfile.create({
          data: {
            id: randomUUID(),
            ownerId: input.userId,
            title: input.title,
            label: input.label,
            partnerDisplayName: input.partnerDisplayName,
            startedAt: input.startedAt,
            status: "ACTIVE",
          },
        });

        await tx.user.update({
          where: { id: input.userId },
          data: {
            activeRelationshipProfileId: profile.id,
            preferredLocale: input.preferredLocale ?? undefined,
          },
        });

        return mapProfile(profile);
      });
    },

    async updateOwnedProfile(userId, profileId, patch: UpdateRelationshipProfileRequest) {
      const existing = await prisma.relationshipProfile.findFirst({
        where: { id: profileId, ownerId: userId },
      });
      if (!existing) {
        return null;
      }

      const profile = await prisma.relationshipProfile.update({
        where: { id: profileId },
        data: {
          title: patch.title,
          label: patch.label === undefined ? undefined : patch.label,
          partnerDisplayName:
            patch.partnerDisplayName === undefined ? undefined : patch.partnerDisplayName,
          startedAt:
            patch.startedAt === undefined
              ? undefined
              : patch.startedAt
                ? new Date(patch.startedAt)
                : null,
        },
      });
      return mapProfile(profile);
    },
  };
}
