# Secret rotation (Phase 11)

## Principles

- Never commit real secrets.
- Never log secret values.
- Access, refresh, and CSRF secrets must be unique and ≥ 32 characters.
- Placeholder patterns (`REPLACE`, `CHANGE_ME`, `YOUR_SECRET`) are rejected in production validation.

## JWT access / refresh rotation

1. Generate two new high-entropy secrets.
2. Deploy API with new secrets during a short maintenance window **or** accept that existing sessions invalidate immediately.
3. Users re-authenticate; refresh-token families minted with the old secret will fail verification.
4. Confirm login + refresh rotation still works after deploy.

## CSRF secret rotation

1. Deploy new `CSRF_SECRET`.
2. Existing CSRF cookies become invalid; browsers obtain a new token via `GET /api/v1/auth/csrf`.
3. No database migration required.

## Database URL rotation

1. Rotate Neon role password or connection string in the secret manager.
2. Update `DATABASE_URL` (API) and `DIRECT_URL` (migrate job) separately if they differ.
3. Rolling-restart API; confirm readiness.
4. Run `node scripts/migrate.mjs status` with the new `DIRECT_URL` without printing it.

## Web public URL changes

Changing `NEXT_PUBLIC_*` requires rebuilding the Web image. These values are public and must never hold JWT/DB secrets.
