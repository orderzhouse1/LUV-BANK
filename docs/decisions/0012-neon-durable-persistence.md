# Neon PostgreSQL migration and durable persistence (Phase 10)

## Status

Accepted — Phase 10 (development/QA Neon branch only)

## Context

Phases 0–9 delivered product behavior against in-memory repositories for local tests. Phase 10 adds a reviewable Prisma migration history, applies it to a dedicated Neon non-production branch, and runs the API with `PERSISTENCE_DRIVER=prisma` without silent memory fallback.

## Decisions

### Connection roles

- `DATABASE_URL`: pooled Prisma runtime traffic
- `DIRECT_URL`: migrations and direct administrative operations
- Prisma datasource uses both `url` and `directUrl`

### Migration policy

- Baseline migration: `20260803120000_phase10_baseline`
- Apply only with `prisma migrate deploy`
- Forbidden: `db push`, `migrate reset`, `DROP`/`TRUNCATE` operational scripts against shared/production data

### Runtime

- `createPersistence()` selects Prisma repositories when `PERSISTENCE_DRIVER=prisma`
- Connection failure refuses to fall back to memory
- Memory remains allowed only for non-production local/unit tests

### Validation

- Neon-gated API tests (`RUN_NEON_TESTS=1`)
- Browser E2E for the critical journey, Arabic RTL smoke, and PWA privacy asset checks
- Honest reporting of the Neon branch identifier used for validation

## Consequences

- Production deployment remains deferred
- Partner accounts, notifications, OAuth, and admin tooling remain deferred
