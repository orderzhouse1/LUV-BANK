# Dependency and container security review (Phase 11)

## Review scope

Static review of deployment artifacts and dependency posture. No production deploy. Container builds were not executed when Docker was unavailable.

## Findings (accepted controls)

1. Secrets are injected at runtime via environment / secret manager templates — not baked into Dockerfiles.
2. `.dockerignore` excludes `.env*`, git metadata, test artifacts, and private key material.
3. Runtime containers use a non-root `luvbank` user (uid 10001).
4. Base images are pinned to Node 22 Debian slim (not `latest`, not Alpine-first).
5. API entrypoint does not run migrations or seeds.
6. Web image receives only `NEXT_PUBLIC_*` / PWA public build args.
7. Production validation rejects placeholder secrets and wildcard CORS.
8. Proxy trust is hop-count based (`TRUST_PROXY_HOPS`), not unconditional `true`.

## Residual risks

1. Without a successful `docker build`, image layer contents are not empirically verified in this environment.
2. `pnpm audit` / SCA should be run by operators before any production release.
3. Reverse-proxy TLS and WAF configuration remain outside this repository.
4. Prisma engines and native `argon2` binaries must be present in the API runtime image — verify after first successful build.

## Out of scope

- Publishing to a container registry
- Production Neon access
- Automatic dependency upgrades
