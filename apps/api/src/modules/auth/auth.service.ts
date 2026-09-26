import { randomUUID } from "node:crypto";
import type { ApiEnv } from "../../config/env";
import { AppError } from "../../errors/app-error";
import {
  generateOpaqueToken,
  hashPassword,
  sha256,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyPassword,
  verifyRefreshToken,
} from "../../lib/crypto";
import type { AuthRepository, SessionRecord, UserRecord } from "./auth.types";
import { toAuthUser } from "./auth.types";
import type {
  AuthSessionResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from "@luv-bank/validation";

export type IssuedAuthTokens = {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  user: AuthUser;
};

export class AuthService {
  constructor(
    private readonly env: ApiEnv,
    private readonly repo: AuthRepository,
  ) {}

  async register(input: RegisterRequest): Promise<IssuedAuthTokens> {
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) {
      throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists.");
    }

    const passwordHash = await hashPassword(input.password);
    let user: UserRecord;
    try {
      user = await this.repo.createUser({
        email: input.email,
        passwordHash,
        displayName: input.displayName,
        preferredLocale: input.preferredLocale ?? "en",
        acceptedTermsAt: new Date(),
      });
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
        throw new AppError(
          409,
          "EMAIL_ALREADY_EXISTS",
          "An account with this email already exists.",
        );
      }
      throw error;
    }

    return this.issueSessionForUser(user);
  }

  async login(input: LoginRequest): Promise<IssuedAuthTokens> {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user || user.deletedAt) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }
    if (user.status !== "ACTIVE") {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }

    await this.repo.updateUserLastLogin(user.id, new Date());
    const fresh = (await this.repo.findUserById(user.id)) ?? user;
    return this.issueSessionForUser(fresh);
  }

  async refresh(rawRefreshToken: string | undefined): Promise<{
    accessToken: string;
    refreshToken: string;
    userId: string;
  }> {
    if (!rawRefreshToken) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    let claims: Awaited<ReturnType<typeof verifyRefreshToken>>;
    try {
      claims = await verifyRefreshToken({
        token: rawRefreshToken,
        secret: this.env.JWT_REFRESH_SECRET,
        issuer: this.env.JWT_ISSUER,
        audience: this.env.JWT_AUDIENCE,
      });
    } catch {
      throw new AppError(401, "SESSION_EXPIRED", "Session expired. Please sign in again.");
    }

    const presentedHash = sha256(rawRefreshToken);
    const session = await this.repo.findSessionByRefreshHash(presentedHash);

    if (!session) {
      // Possible reuse of an already-rotated token: revoke family if we can resolve it.
      const byId = await this.repo.findSessionById(claims.sid);
      if (byId && byId.familyId === claims.familyId) {
        await this.repo.revokeFamily(byId.familyId, new Date());
      }
      throw new AppError(401, "SESSION_EXPIRED", "Session expired. Please sign in again.");
    }

    if (session.revokedAt || session.replacedBySessionId) {
      await this.repo.revokeFamily(session.familyId, new Date());
      throw new AppError(401, "SESSION_EXPIRED", "Session expired. Please sign in again.");
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.repo.revokeSession(session.id, new Date());
      throw new AppError(401, "SESSION_EXPIRED", "Session expired. Please sign in again.");
    }

    const user = await this.repo.findUserById(session.userId);
    if (!user || user.status !== "ACTIVE" || user.deletedAt) {
      await this.repo.revokeFamily(session.familyId, new Date());
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    const nextSessionId = randomUUID();
    const { token: refreshToken, expiresAt } = await signRefreshToken({
      userId: user.id,
      sessionId: nextSessionId,
      familyId: session.familyId,
      secret: this.env.JWT_REFRESH_SECRET,
      issuer: this.env.JWT_ISSUER,
      audience: this.env.JWT_AUDIENCE,
      ttl: this.env.JWT_REFRESH_TTL,
    });

    await this.repo.createSession({
      id: nextSessionId,
      userId: user.id,
      familyId: session.familyId,
      refreshTokenHash: sha256(refreshToken),
      expiresAt,
      clientKind: session.clientKind,
    });
    await this.repo.markSessionReplaced({
      sessionId: session.id,
      replacedBySessionId: nextSessionId,
      revokedAt: new Date(),
    });

    const { token: accessToken } = await signAccessToken({
      userId: user.id,
      sessionId: nextSessionId,
      secret: this.env.JWT_ACCESS_SECRET,
      issuer: this.env.JWT_ISSUER,
      audience: this.env.JWT_AUDIENCE,
      ttl: this.env.JWT_ACCESS_TTL,
    });

    return { accessToken, refreshToken, userId: user.id };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }
    try {
      const claims = await verifyRefreshToken({
        token: rawRefreshToken,
        secret: this.env.JWT_REFRESH_SECRET,
        issuer: this.env.JWT_ISSUER,
        audience: this.env.JWT_AUDIENCE,
      });
      const session = await this.repo.findSessionById(claims.sid);
      if (session && !session.revokedAt) {
        await this.repo.revokeSession(session.id, new Date());
      }
    } catch {
      // Idempotent logout — ignore invalid tokens.
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.repo.revokeAllUserSessions(userId, new Date());
  }

  async me(accessToken: string | undefined): Promise<AuthSessionResponse> {
    const { user } = await this.requireAuthContext(accessToken);
    const profile = await this.repo.findActiveProfileForUser(user.id);
    return { user: toAuthUser(user, profile) };
  }

  async requireUserFromAccessToken(accessToken: string | undefined): Promise<UserRecord> {
    const context = await this.requireAuthContext(accessToken);
    return context.user;
  }

  async requireAuthContext(
    accessToken: string | undefined,
  ): Promise<{ user: UserRecord; sessionId: string }> {
    if (!accessToken) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    let claims: Awaited<ReturnType<typeof verifyAccessToken>>;
    try {
      claims = await verifyAccessToken({
        token: accessToken,
        secret: this.env.JWT_ACCESS_SECRET,
        issuer: this.env.JWT_ISSUER,
        audience: this.env.JWT_AUDIENCE,
      });
    } catch {
      throw new AppError(401, "SESSION_EXPIRED", "Session expired. Please sign in again.");
    }

    const session = await this.repo.findSessionById(claims.sid);
    if (!session || session.revokedAt || session.userId !== claims.sub) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new AppError(401, "SESSION_EXPIRED", "Session expired. Please sign in again.");
    }

    const user = await this.repo.findUserById(claims.sub);
    if (!user || user.status !== "ACTIVE" || user.deletedAt) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication required.");
    }

    await this.repo.touchSession(session.id, new Date());
    return { user, sessionId: session.id };
  }

  issueCsrfToken(): string {
    return generateOpaqueToken(32);
  }

  private async issueSessionForUser(user: UserRecord): Promise<IssuedAuthTokens> {
    const sessionId = randomUUID();
    const familyId = randomUUID();

    const { token: refreshToken, expiresAt } = await signRefreshToken({
      userId: user.id,
      sessionId,
      familyId,
      secret: this.env.JWT_REFRESH_SECRET,
      issuer: this.env.JWT_ISSUER,
      audience: this.env.JWT_AUDIENCE,
      ttl: this.env.JWT_REFRESH_TTL,
    });

    await this.repo.createSession({
      id: sessionId,
      userId: user.id,
      familyId,
      refreshTokenHash: sha256(refreshToken),
      expiresAt,
      clientKind: "web",
    } satisfies Omit<
      SessionRecord,
      "createdAt" | "lastUsedAt" | "revokedAt" | "replacedBySessionId"
    >);

    const { token: accessToken } = await signAccessToken({
      userId: user.id,
      sessionId,
      secret: this.env.JWT_ACCESS_SECRET,
      issuer: this.env.JWT_ISSUER,
      audience: this.env.JWT_AUDIENCE,
      ttl: this.env.JWT_ACCESS_TTL,
    });

    const profile = await this.repo.findActiveProfileForUser(user.id);
    return {
      accessToken,
      refreshToken,
      csrfToken: this.issueCsrfToken(),
      user: toAuthUser(user, profile),
    };
  }
}
