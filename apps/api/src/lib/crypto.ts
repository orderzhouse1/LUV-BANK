import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "argon2";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const ACCESS_COOKIE = "luv_access";
export const REFRESH_COOKIE = "luv_refresh";
export const CSRF_COOKIE = "luv_csrf";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export async function hashPassword(password: string): Promise<string> {
  return argonHash(password, {
    type: 2, // argon2id
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await argonVerify(passwordHash, password);
  } catch {
    return false;
  }
}

export function parseDurationToSeconds(input: string): number {
  const match = /^(\d+)([smhd])$/i.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid duration: ${input}`);
  }
  const amount = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  switch (unit) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 60 * 60;
    case "d":
      return amount * 60 * 60 * 24;
    default:
      throw new Error(`Invalid duration unit: ${input}`);
  }
}

export type AccessTokenClaims = {
  sub: string;
  sid: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
};

export async function signAccessToken(input: {
  userId: string;
  sessionId: string;
  secret: string;
  issuer: string;
  audience: string;
  ttl: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const seconds = parseDurationToSeconds(input.ttl);
  const expiresAt = new Date(Date.now() + seconds * 1000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setJti(input.sessionId)
    .setIssuer(input.issuer)
    .setAudience(input.audience)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(input.secret));

  return { token, expiresAt };
}

export async function verifyAccessToken(input: {
  token: string;
  secret: string;
  issuer: string;
  audience: string;
}): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(input.token, new TextEncoder().encode(input.secret), {
    issuer: input.issuer,
    audience: input.audience,
    algorithms: ["HS256"],
  });

  return normalizeAccessClaims(payload);
}

export async function signRefreshToken(input: {
  userId: string;
  sessionId: string;
  familyId: string;
  secret: string;
  issuer: string;
  audience: string;
  ttl: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const seconds = parseDurationToSeconds(input.ttl);
  const expiresAt = new Date(Date.now() + seconds * 1000);
  const token = await new SignJWT({ fid: input.familyId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setJti(input.sessionId)
    .setIssuer(input.issuer)
    .setAudience(input.audience)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(input.secret));

  return { token, expiresAt };
}

export async function verifyRefreshToken(input: {
  token: string;
  secret: string;
  issuer: string;
  audience: string;
}): Promise<AccessTokenClaims & { familyId: string }> {
  const { payload } = await jwtVerify(input.token, new TextEncoder().encode(input.secret), {
    issuer: input.issuer,
    audience: input.audience,
    algorithms: ["HS256"],
  });

  const claims = normalizeAccessClaims(payload);
  const familyId = typeof payload.fid === "string" ? payload.fid : "";
  if (!familyId) {
    throw new Error("Refresh token missing family id");
  }
  return { ...claims, familyId };
}

function normalizeAccessClaims(payload: JWTPayload): AccessTokenClaims {
  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("Invalid subject");
  }
  if (typeof payload.jti !== "string" || !payload.jti) {
    throw new Error("Invalid session id");
  }
  if (typeof payload.iss !== "string" || typeof payload.aud !== "string") {
    throw new Error("Invalid issuer/audience");
  }
  if (typeof payload.iat !== "number" || typeof payload.exp !== "number") {
    throw new Error("Invalid timestamps");
  }

  return {
    sub: payload.sub,
    sid: payload.jti,
    iss: payload.iss,
    aud: payload.aud,
    iat: payload.iat,
    exp: payload.exp,
  };
}
