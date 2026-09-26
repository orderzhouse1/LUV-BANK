# Explicit database migration job (Phase 11)

## Rules

- Migration is an **operator action**, never an API startup side effect.
- Use `DIRECT_URL` for migrate status/deploy.
- API runtime uses pooled `DATABASE_URL` and does not require migration privileges.
- No `db push`, no `migrate reset`, no automatic seed, no destructive fallback.

## Local / CI commands

```bash
node scripts/migrate.mjs status
node scripts/migrate.mjs deploy
```

Equivalent package scripts:

```bash
pnpm --filter @luv-bank/database prisma:migrate:status
pnpm --filter @luv-bank/database prisma:migrate:deploy
```

## Container commands

```bash
docker compose -f deploy/docker-compose.production.yml --profile migrate run --rm migrate migrate status --schema prisma/schema.prisma
docker compose -f deploy/docker-compose.production.yml --profile migrate run --rm migrate migrate deploy --schema prisma/schema.prisma
```

## After migrate

1. Confirm status reports no pending migrations.
2. Start or restart API.
3. Check `GET /api/v1/health/ready` → `status: ready`, `persistence: prisma`, `database: ok`.
