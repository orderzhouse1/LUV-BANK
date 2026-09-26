# Neon staging / non-production branch runbook

## Purpose

Operate against a dedicated Neon **development / QA / staging** branch only.
Never use this runbook against a production Neon branch.

## Known Phase 10 validation target (masked)

- Branch id pattern: `br-gentle-sea-*`
- Database name: `neondb`
- Runtime: pooled `DATABASE_URL`
- Migrations: direct `DIRECT_URL`
- Persistence: `PERSISTENCE_DRIVER=prisma`

## Safety rules

1. Confirm the Neon branch id is not production-named (`prod`, `production`, `live`, `main-prod`).
2. Run `node packages/database/scripts/neon-safety-preflight.mjs` before structural changes.
3. Never run `prisma db push`, `migrate reset`, `DROP`, or `TRUNCATE` as operational shortcuts.
4. Do not print connection strings or secrets into logs, tickets, or chat.

## Migration commands

```bash
# status (requires DIRECT_URL)
node scripts/migrate.mjs status

# deploy pending reviewed migrations only
node scripts/migrate.mjs deploy
```

Container equivalent (after images exist):

```bash
docker compose -f deploy/docker-compose.smoke.yml --profile migrate run --rm migrate migrate status --schema prisma/schema.prisma
docker compose -f deploy/docker-compose.smoke.yml --profile migrate run --rm migrate migrate deploy --schema prisma/schema.prisma
```

## API readiness

```bash
curl -sS http://127.0.0.1:4000/api/v1/health/live
curl -sS http://127.0.0.1:4000/api/v1/health/ready
```

Ready must report `persistence: prisma` and `database: ok` for staging Prisma mode.
