# ADR 0013 — Production containers and security hardening

## Status

Accepted for Phase 11 (artifacts and controls). Container image builds were **not** executed in the environment that authored this ADR when Docker was unavailable.

## Context

Phase 10 proved durable Prisma persistence on a dedicated non-production Neon branch. Phase 11 adds production-shaped deployment artifacts without performing a production deploy.

## Decisions

1. Separate images for API and Web; optional one-shot migrate image/profile.
2. Multi-stage Node 22 Debian slim builds; non-root runtime user; no `.env` in images.
3. API entrypoint never runs migrations or seeds.
4. Production env validation requires HTTPS, secure cookies, prisma persistence, distinct secrets, exact CORS origins, and explicit `TRUST_PROXY_HOPS` (never unconditional `true`).
5. Local container smoke may set `ALLOW_INSECURE_LOCAL_PRODUCTION_SMOKE=true` only for localhost/127.0.0.1.
6. Liveness (`/api/v1/health/live`) vs readiness (`/api/v1/health/ready` with DB check).
7. Structured JSON logs with secret/URL redaction.
8. Next.js `output: "standalone"` for the web image; PWA public assets copied explicitly.

## Consequences

- Operators must run migrate as a separate job.
- Changing `NEXT_PUBLIC_*` requires rebuilding the web image.
- Without Docker daemon availability, image build/smoke validation remains blocked.
