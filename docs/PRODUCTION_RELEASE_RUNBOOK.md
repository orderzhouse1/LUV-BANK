# Production release runbook (Phase 11)

## Scope

Prepares and documents a production release. This runbook does **not** authorize an actual production deploy by itself.

## Preconditions

- Phase 10 Neon validation complete on a non-production branch
- Docker images built and reviewed (`luv-bank-api`, `luv-bank-web`, `luv-bank-migrate`)
- Secrets provisioned in a secret manager (never in git)
- TLS termination configured at the reverse proxy / platform edge
- `TRUST_PROXY_HOPS` set to the exact hop count (usually `1`) — never unconditional `true`
- Production env validation passes (`NODE_ENV=production`, HTTPS URLs, `COOKIE_SECURE=true`, `PERSISTENCE_DRIVER=prisma`)

## Variable classes

| Class                       | Examples                                      | Notes                                                  |
| --------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| Server-only runtime secrets | `JWT_*`, `CSRF_SECRET`, `DATABASE_URL`        | API container only                                     |
| Migration credentials       | `DIRECT_URL`                                  | Migration job only                                     |
| Web build-time public       | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`  | Rebuilding the web image is required when these change |
| Safe PWA build values       | `PWA_CACHE_VERSION`, `NEXT_PUBLIC_PWA_ENABLE` | Public; not secrets                                    |

## Release sequence (operator)

1. Freeze reviewed git revision (operator-controlled).
2. Build images from that revision with pinned `node:22.x-bookworm-slim`.
3. Run migration **status** against the intended database using `DIRECT_URL`.
4. If pending migrations exist, run migrate **deploy** as an explicit one-shot job.
5. Confirm migrate status is clean.
6. Roll out API containers; wait for `/api/v1/health/ready`.
7. Roll out Web containers; verify `/en`, `/ar`, manifests, `/sw.js`, offline pages.
8. Run smoke checks: register/login CSRF path, moment create, balance read.
9. Monitor structured logs for elevated 5xx without inspecting private note contents.

## Forbidden during release

- Embedding `.env` into images
- Running migrate from the API entrypoint
- `prisma db push` / `migrate reset`
- Enabling `ALLOW_INSECURE_LOCAL_PRODUCTION_SMOKE`
- Wildcard CORS
- Memory persistence
