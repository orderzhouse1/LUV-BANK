# Phase 10 — Neon durable persistence QA

## Prerequisites

1. Dedicated Neon **development/QA/staging** branch (not production).
2. Local `.env` passes `node scripts/check-phase10-infra.mjs` with `"blocked": false`.
3. Baseline migration applied via `pnpm --filter @luv-bank/database prisma:migrate:deploy`.

## Validation target (masked)

- Neon branch id: `br-gentle-sea-*` (non-production naming; not matched as prod/live/main-prod)
- Database: `neondb`
- Host family: Neon AWS `us-east-2`
- Migration history: 1 applied (`20260803120000_phase10_baseline`)
- Public tables present: AuthSession, Moment, NudgeSuppression, RelationshipProfile, ReminderPreference, ShareSnapshot, User, `_prisma_migrations`

## Checks

- [x] `PERSISTENCE_DRIVER=prisma` with no memory fallback on connection failure.
- [x] Register → profile → moment → balance persists in PostgreSQL.
- [x] Concurrent duplicate email registration yields one success and one conflict.
- [x] Concurrent identical `clientMutationId` creates only one moment row.
- [x] Prisma disconnect/reconnect still reads previously written rows.
- [x] Account hard delete removes owned rows; email can re-register.
- [x] Browser E2E critical journey succeeds.
- [x] `/ar` remains RTL; `/en` remains LTR.
- [x] `/sw.js` remains `Cache-Control: no-cache` and does not cache private API/HTML.
- [x] Offline pages state that private data is not stored offline.

## Commands used

```bash
node scripts/check-phase10-infra.mjs
node packages/database/scripts/neon-safety-preflight.mjs
pnpm test
RUN_NEON_TESTS=1 pnpm test:neon
pnpm --filter @luv-bank/web run build
pnpm test:e2e
```

## Boundary

Phase 10 does **not** include production deployment, partner accounts, notifications, OAuth, passkeys, AI, or admin features.
