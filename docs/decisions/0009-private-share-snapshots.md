# Private sharing and expiring balance snapshots (Phase 7)

## Status

Accepted — Phase 7

## Context

Phases 3–6 provide private balance, insights, nudges, and in-app reminders. Phase 7 adds user-created, read-only, immutable, expiring share snapshots — not live account access and not partner accounts.

## Decisions

### Snapshot version

- Identifier: `PRIVATE_SHARE_SNAPSHOT_V1`
- Configured via `ACTIVE_SHARE_SNAPSHOT_VERSION` (reviewed IDs only)
- Stored with every record; validated before public serve
- Separate from scoring / insight / nudge versions

### Scopes

- `POSITIVE_ONLY`
- `SELECTED_PERIOD_SUMMARY`
- `EXTENDED_BALANCE_SUMMARY`

Windows: `7d` / `30d` / `90d` (default `30d`). Expiration durations: `1d` / `7d` / `30d` only (server-computed `expiresAt`).

### Privacy

- Immutable aggregate snapshot; later ledger edits do not change it
- No notes, moment IDs, mutation IDs, user/profile IDs, partner aliases, emails, nudges, reminders, or viewer analytics
- Raw bearer token returned once; only SHA-256 `tokenHash` stored
- Fragment-based link: `/{locale}/shared#<token>`
- Public resolve: `POST /api/v1/public/share-snapshots/resolve`
- No end-to-end encryption claim

### API

- Authenticated: preview / create / list / revoke under `/api/v1/share-snapshots`
- CSRF on mutations; `Cache-Control: no-store`; `Referrer-Policy: no-referrer`
- Public resolve is unauthenticated and rate-limited

## Consequences

- `/app/share` manages snapshots; `/shared` displays public read-only views
- Partner accounts, messaging, and email/push remain deferred
