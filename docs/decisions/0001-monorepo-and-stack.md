# Monorepo and stack

## Status

Accepted — Phase 0

## Context

Luv Bank needs a bilingual web product (Next.js) and a separate Express REST API, with shared validation and a Prisma/Neon data layer. The master context recommends a pnpm workspace with clear ownership boundaries.

## Decision

- Use **pnpm workspaces** with `packageManager` pinned to `pnpm@10.30.3`.
- Apps: `@luv-bank/web`, `@luv-bank/api`.
- Packages: `@luv-bank/database`, `@luv-bank/validation`, `@luv-bank/config`.
- Do **not** create `@luv-bank/ui` in Phase 0; reusable UI lives under `apps/web/src/components`.
- Use lightweight typed English/Arabic dictionaries (no next-intl in Phase 0).
- Do not add pnpm hoisting settings unless a concrete dependency problem requires them.

## Consequences

- Shared Zod schemas prevent client/API drift without coupling React to Prisma.
- Prisma lives only in `@luv-bank/database`; Phase 0 does not run migrations or claim Neon connectivity.
- Auth, scoring, and product features remain deferred to later phases.
