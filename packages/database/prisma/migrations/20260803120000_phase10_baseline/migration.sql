-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PreferredLocale" AS ENUM ('en', 'ar');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MomentKind" AS ENUM ('POSITIVE', 'DIFFICULT');

-- CreateEnum
CREATE TYPE "ShareScope" AS ENUM ('POSITIVE_ONLY', 'SELECTED_PERIOD_SUMMARY', 'EXTENDED_BALANCE_SUMMARY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "preferredLocale" "PreferredLocale" NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "acceptedTermsAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "activeRelationshipProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedBySessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "clientKind" TEXT,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipProfile" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "label" TEXT,
    "partnerDisplayName" TEXT,
    "startedAt" TIMESTAMP(3),
    "status" "RelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelationshipProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NudgeSuppression" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "nudgeCode" TEXT NOT NULL,
    "suppressedUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NudgeSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Moment" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "kind" "MomentKind" NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "clientMutationId" TEXT NOT NULL,
    "payloadFingerprint" TEXT NOT NULL,
    "scoreImpact" INTEGER NOT NULL,
    "scoringVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Moment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderPreference" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "cadence" TEXT NOT NULL DEFAULT 'WEEKLY',
    "purposeCode" TEXT NOT NULL DEFAULT 'PRIVATE_WEEKLY_CHECK_IN',
    "weekday" TEXT NOT NULL DEFAULT 'MONDAY',
    "localHour" INTEGER NOT NULL DEFAULT 18,
    "localMinute" INTEGER NOT NULL DEFAULT 0,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Amman',
    "nextDueAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareSnapshot" (
    "id" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "scope" "ShareScope" NOT NULL,
    "window" TEXT NOT NULL,
    "snapshotVersion" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_activeRelationshipProfileId_key" ON "User"("activeRelationshipProfileId");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthSession_familyId_idx" ON "AuthSession"("familyId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE INDEX "RelationshipProfile_ownerId_status_idx" ON "RelationshipProfile"("ownerId", "status");

-- CreateIndex
CREATE INDEX "NudgeSuppression_relationshipId_suppressedUntil_idx" ON "NudgeSuppression"("relationshipId", "suppressedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "NudgeSuppression_relationshipId_nudgeCode_key" ON "NudgeSuppression"("relationshipId", "nudgeCode");

-- CreateIndex
CREATE INDEX "Moment_relationshipId_occurredAt_id_idx" ON "Moment"("relationshipId", "occurredAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Moment_relationshipId_kind_idx" ON "Moment"("relationshipId", "kind");

-- CreateIndex
CREATE INDEX "Moment_relationshipId_categoryCode_idx" ON "Moment"("relationshipId", "categoryCode");

-- CreateIndex
CREATE INDEX "Moment_relationshipId_occurredAt_idx" ON "Moment"("relationshipId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Moment_relationshipId_clientMutationId_key" ON "Moment"("relationshipId", "clientMutationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderPreference_relationshipId_key" ON "ReminderPreference"("relationshipId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareSnapshot_tokenHash_key" ON "ShareSnapshot"("tokenHash");

-- CreateIndex
CREATE INDEX "ShareSnapshot_relationshipId_createdAt_idx" ON "ShareSnapshot"("relationshipId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ShareSnapshot_expiresAt_idx" ON "ShareSnapshot"("expiresAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeRelationshipProfileId_fkey" FOREIGN KEY ("activeRelationshipProfileId") REFERENCES "RelationshipProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipProfile" ADD CONSTRAINT "RelationshipProfile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NudgeSuppression" ADD CONSTRAINT "NudgeSuppression_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "RelationshipProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Moment" ADD CONSTRAINT "Moment_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "RelationshipProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderPreference" ADD CONSTRAINT "ReminderPreference_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "RelationshipProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareSnapshot" ADD CONSTRAINT "ShareSnapshot_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "RelationshipProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareSnapshot" ADD CONSTRAINT "ShareSnapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

