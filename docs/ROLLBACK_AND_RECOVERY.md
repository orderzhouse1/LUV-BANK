# Rollback and recovery (Phase 11)

## Application rollback

1. Redeploy the previous known-good API and Web image tags.
2. Confirm `/api/v1/health/live` and `/api/v1/health/ready`.
3. Confirm Web `/en` and `/ar` respond.

Application rollback does **not** automatically reverse database migrations.

## Migration rollback policy

- Forward-only migrations are preferred.
- Do not edit or recreate applied migrations.
- If a bad migration was deployed to a non-production branch, restore from Neon branch/timeline recovery rather than hand-written DROP scripts when possible.
- Production schema rollback requires an explicit reviewed reverse migration or point-in-time restore — never improvised destructive SQL.

## API process recovery

- SIGTERM triggers graceful close + Prisma disconnect.
- If shutdown exceeds `SHUTDOWN_TIMEOUT_MS`, the process force-exits non-zero for the orchestrator to restart.
- Crash loops: check readiness (`database: unavailable`) before blaming the web tier.

## Data recovery

- Account deletion is immediate and hard — there is no soft-delete undelete path.
- Share snapshots become unavailable after owner deletion.
- Use Neon PITR / branch restore for catastrophic recovery; document the restore point and re-run migrate status afterward.
