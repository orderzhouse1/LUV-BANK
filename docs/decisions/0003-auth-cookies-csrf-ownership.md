# Authentication cookies, CSRF, and ownership

## Status

Accepted — Phase 1

## Context

Phase 0 documented cookie/CORS intent. Phase 1 implements email/password authentication with HttpOnly JWTs, refresh rotation, CSRF defense-in-depth, and private relationship-profile ownership.

## Decisions

### Access JWT

- Short-lived HS256 JWT (`JWT_ACCESS_TTL`, default 15m)
- Claims: `sub` (user id), `jti` (session id), `iss`, `aud`, `iat`, `exp`
- Stored only in HttpOnly cookie `luv_access` (Path=/)
- Never returned in JSON

### Refresh JWT + family rotation

- Longer-lived HS256 JWT (`JWT_REFRESH_TTL`, default 30d) with `fid` (family id)
- Stored only in HttpOnly cookie `luv_refresh` (Path=/api/v1/auth)
- Database stores `refreshTokenHash` only (SHA-256 of full token)
- Successful refresh creates a new session in the same family and revokes/replaces the previous one
- Presenting a revoked/replaced refresh token revokes the entire family

### CSRF

- Double-submit cookie `luv_csrf` (readable by JS, not HttpOnly)
- State-changing requests require matching `X-CSRF-Token`
- Origin validated against `CORS_ORIGINS` when present
- `GET /api/v1/auth/csrf` issues/refreshes the cookie and returns the token

### Cookies (local)

- Empty `COOKIE_DOMAIN` means host-only (no Domain attribute)
- Never set `COOKIE_DOMAIN=localhost`

### Ownership / active profile

- `User` may own many `RelationshipProfile` rows
- `User.activeRelationshipProfileId` points at the active profile
- Services always derive owner from the authenticated session, never from client body `userId`/`ownerId`
- Phase 1 UI exposes one active profile; duplicate create is idempotent

### Live database

- Prisma schema evolved for Phase 1
- `prisma format` / `validate` / `generate` only — **no migrate apply** without a real Neon `DATABASE_URL`
- API Phase 1 default process uses an **in-memory auth repository** until a migrated database is configured
- Prisma repository adapter exists for future Neon wiring

## Consequences

- Auth can be tested without Neon via in-memory repositories
- Production Neon auth requires applying migrations and switching the API to the Prisma repository
- Moment logging and scoring remain Phase 2+
