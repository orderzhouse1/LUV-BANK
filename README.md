# Luv Bank

Premium bilingual (English / Arabic) relationship-wellbeing web application.

This repository is a **pnpm monorepo**. Current delivery:

- **Phase 0:** workspace, bilingual shells, design tokens, health endpoint, Prisma foundation
- **Phase 1:** email/password authentication, CSRF, onboarding relationship profile, ownership checks
- **Phase 2:** private moment ledger (create / list / filter / edit / delete) for the active relationship profile
- **Phase 3:** versioned equal-weight scoring (`MVP_EQUAL_WEIGHT_V1`) and relationship balance summaries
- **Phase 4:** descriptive trends and reflective observation codes (`DESCRIPTIVE_INSIGHTS_V1`)
- **Phase 5:** optional gentle in-app nudges (`GENTLE_NUDGES_V1`) with user-controlled suppression
- **Phase 6:** user-scheduled weekly in-app reminders (`IN_APP_CHECK` delivery only)
- **Phase 7:** private, immutable, expiring share snapshots (`PRIVATE_SHARE_SNAPSHOT_V1`)
- **Phase 8:** account sessions, password change, personal-data export (`LUV_BANK_DATA_EXPORT_V1`), immediate hard account deletion
- **Phase 9:** installable bilingual PWA foundation with a privacy-safe offline shell (no private-data caching, no push)
- **Phase 10:** Neon PostgreSQL durable persistence (`PERSISTENCE_DRIVER=prisma`) with reviewed baseline migration and live validation on a dedicated non-production branch
- **Phase 11:** Production deployment readiness artifacts (Dockerfiles, compose templates, hardened env validation, runbooks) — no production deploy

Partner accounts, email, and push notifications are **not** implemented yet.

## Prerequisites

- Node.js 22+
- pnpm 10.30.3 (`packageManager` is pinned in the root `package.json`)

## Workspace layout

| Path                  | Package                | Role                             |
| --------------------- | ---------------------- | -------------------------------- |
| `apps/web`            | `@luv-bank/web`        | Next.js App Router frontend      |
| `apps/api`            | `@luv-bank/api`        | Express REST API                 |
| `packages/database`   | `@luv-bank/database`   | Prisma schema and client wrapper |
| `packages/validation` | `@luv-bank/validation` | Shared Zod schemas / DTOs        |
| `packages/config`     | `@luv-bank/config`     | Shared TypeScript / env helpers  |

## Local setup

1. Copy environment placeholders:

   ```bash
   cp .env.example .env
   ```

   Replace JWT/CSRF secrets with long unique values. Leave `COOKIE_DOMAIN` empty for host-only local cookies.

   Set `PERSISTENCE_DRIVER=memory` for local development and tests. Memory mode resets when the API process restarts and is **rejected in production**.

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Generate the Prisma client (does **not** require a live database when using a placeholder `DATABASE_URL`):

   ```bash
   pnpm --filter @luv-bank/database exec prisma generate
   ```

4. Run the API and web apps:

   ```bash
   pnpm dev
   ```

   - Web: [http://localhost:3000](http://localhost:3000) (redirects to `/en`)
   - API health: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

## Persistence

| Driver   | Use                                    | Durable?                           |
| -------- | -------------------------------------- | ---------------------------------- |
| `memory` | Local development and automated tests  | No — resets on API process restart |
| `prisma` | Production after migrations + Neon URL | Yes — requires migrated Postgres   |

- Production must set `PERSISTENCE_DRIVER=prisma` and provide `DATABASE_URL` (pooled). `DIRECT_URL` is required for the explicit migration job, not for API query runtime.
- The API never silently falls back from Prisma to memory.
- Apply migrations only with `node scripts/migrate.mjs deploy` (or the migrate container profile) against a reviewed non-production Neon branch first.

## Auth, ledger, and scoring notes

- Access/refresh tokens are HttpOnly cookies (`luv_access`, `luv_refresh`). They are never returned in JSON and must not be stored in `localStorage`/`sessionStorage`.
- Mutations require a CSRF cookie + `X-CSRF-Token` header (`GET /api/v1/auth/csrf`).
- Moments belong to the authenticated user’s **active** relationship profile.
- Each moment stores grandfathered `scoreImpact` and `scoringVersion` under `MVP_EQUAL_WEIGHT_V1` (+1 / −1 equal weight).
- Balance: `GET /api/v1/balance/summary?window=7d|30d|90d|all` (default `30d`). Descriptive only — not a clinical measure.
- Insights: `GET /api/v1/insights/summary?window=7d|30d|90d` (default `30d`). Structured observation codes + trend buckets; notes never read; no advice or clinical labels.
- `ACTIVE_INSIGHT_RULESET` must be a reviewed ruleset ID (`DESCRIPTIVE_INSIGHTS_V1`).
- Nudges: `GET /api/v1/nudges/current?window=7d|30d|90d` (default `30d`); `POST /api/v1/nudges/suppress` (CSRF). Codes only; optional; dismissal never affects balance or insights.
- `ACTIVE_NUDGE_RULESET` must be a reviewed ruleset ID (`GENTLE_NUDGES_V1`).
- Reminders: `GET/PUT /api/v1/reminders/preference`; `POST /api/v1/reminders/dismiss|snooze` (CSRF). Weekly cadence only; IANA timezone + server-owned `nextDueAt` via `@js-temporal/polyfill`. **In-app check only** — no push/email/background delivery.
- Shares: `POST /api/v1/share-snapshots/preview|/` ; `GET /api/v1/share-snapshots` ; `POST /api/v1/share-snapshots/:id/revoke` ; public `POST /api/v1/public/share-snapshots/resolve`. Fragment links `/{locale}/shared#<token>`; raw token once; hash at rest; no notes/IDs.
- `ACTIVE_SHARE_SNAPSHOT_VERSION` must be a reviewed version ID (`PRIVATE_SHARE_SNAPSHOT_V1`).
- Account: `GET /api/v1/account/sessions` ; `POST /api/v1/account/sessions/:id/revoke` ; `POST /api/v1/account/password|export|delete` (step-up password + CSRF); `GET /api/v1/account/deletion-summary` ; `POST /api/v1/account/shares/revoke-all` ; `DELETE /api/v1/account/shares/:id`. Export format `LUV_BANK_DATA_EXPORT_V1`. Account deletion is immediate hard delete after password + `DELETE_MY_ACCOUNT` — no soft-delete tombstone.
- PWA: locale manifests at `/{locale}/manifest.webmanifest`; custom `/sw.js` allowlists only `/pwa/**`, offline HTML, and `/_next/static/**`. Private pages/API responses are never cached. No push, Background Sync, or offline mutation queue. Generate assets with `pnpm --filter @luv-bank/web generate:pwa` (`PWA_CACHE_VERSION`, default `phase-9-v1`).
- Persistence: `PERSISTENCE_DRIVER=memory` for local unit tests; `PERSISTENCE_DRIVER=prisma` requires `DATABASE_URL` + `DIRECT_URL` and applied migrations. Prisma mode never silently falls back to memory. Neon live checks: `pnpm test:neon` with `RUN_NEON_TESTS=1`.
- Future DB backfill (not applied): existing moments would receive ±1 and `MVP_EQUAL_WEIGHT_V1`.

## Useful scripts

| Script                              | Purpose                                                   |
| ----------------------------------- | --------------------------------------------------------- |
| `pnpm dev`                          | Start web and API in development                          |
| `pnpm build`                        | Build workspace packages and apps                         |
| `pnpm lint`                         | Lint packages                                             |
| `pnpm typecheck`                    | TypeScript project checks                                 |
| `pnpm test`                         | API + web tests (in-memory persistence; no Neon required) |
| `pnpm format` / `pnpm format:check` | Prettier                                                  |

## Documentation

- Product context: `docs/LUV_BANK_CURSOR_MASTER_CONTEXT.md`
- ADRs: `docs/decisions/`
- Phase 2 QA: `docs/qa/PHASE_2_MOMENT_LEDGER.md`
- Phase 3 QA: `docs/qa/PHASE_3_SCORING_BALANCE.md`
- Phase 4 QA: `docs/qa/PHASE_4_DESCRIPTIVE_INSIGHTS.md`
- Phase 5 QA: `docs/qa/PHASE_5_GENTLE_NUDGES.md`
- Phase 6 QA: `docs/qa/PHASE_6_IN_APP_REMINDERS.md`
- Phase 7 QA: `docs/qa/PHASE_7_PRIVATE_SHARE_SNAPSHOTS.md`
- Phase 8 QA: `docs/qa/PHASE_8_ACCOUNT_SECURITY.md`
- Phase 9 QA: `docs/qa/PHASE_9_PWA_OFFLINE_SHELL.md`
- Phase 10 QA: `docs/qa/PHASE_10_NEON_DURABLE_PERSISTENCE.md`
- Phase 11 QA: `docs/qa/PHASE_11_PRODUCTION_DEPLOYMENT_READINESS.md`
- Neon staging: `docs/NEON_STAGING_RUNBOOK.md`
- Production release / rollback / secrets / migration job: `docs/PRODUCTION_RELEASE_RUNBOOK.md`, `docs/ROLLBACK_AND_RECOVERY.md`, `docs/SECRET_ROTATION.md`, `docs/MIGRATION_JOB.md`
- Retention/deletion: `docs/DATA_RETENTION_AND_DELETION.md`
- Deploy templates: `deploy/`

## Deferred

Phase 12+: partner accounts, email/push delivery, admin tooling, and actual production cutover.
