# Phase 11 — Production deployment readiness QA

## Infrastructure gate

- [ ] `docker version` available — **BLOCKED** (Docker CLI not installed / not on PATH)
- [ ] `docker compose version` available — **BLOCKED**

If Docker is unavailable: stop container validation and report `BLOCKED_DOCKER_RUNTIME`.

## Phase 10 regression (required before claiming Phase 11 progress)

- [x] `pnpm format:check`
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm test:neon` against `br-gentle-sea-*`
- [x] `pnpm test:e2e`
- [x] migrate status clean (1 migration; schema up to date)

## Hardening checks (code-level; no production deploy)

- [x] Production env rejects placeholders, identical secrets, wildcard CORS, memory driver, non-HTTPS public URLs
- [x] `ALLOW_INSECURE_LOCAL_PRODUCTION_SMOKE` only accepts localhost/127.0.0.1
- [x] API runtime does not require `DIRECT_URL`
- [x] Migration job requires `DIRECT_URL`
- [x] `TRUST_PROXY_HOPS` used instead of unconditional `trust proxy true`
- [x] `/api/v1/health/live` and `/api/v1/health/ready` exist
- [x] Graceful SIGTERM shutdown with timeout
- [x] Structured logger redacts secrets/URLs
- [x] Next.js standalone (Docker via `OUTPUT_STANDALONE=1`) + security headers configured
- [x] No push / Notification / Background Sync / partner / AI / analytics systems added

## Container checks (require Docker)

- [ ] API image builds
- [ ] Web image builds
- [ ] Migrate image builds
- [ ] Smoke compose starts against non-production Neon
- [ ] Ready endpoint reports prisma + database ok
- [ ] Web serves `/en`, `/ar`, manifests, `/sw.js`, offline pages
- [ ] Only Phase 11 smoke containers/networks cleaned up afterward

## Boundary

Phase 11 does **not** deploy to production, modify DNS, or migrate a production database.

## Result

`BLOCKED_DOCKER_RUNTIME` — safe code/docs delivered; container build and smoke validation not executed.
