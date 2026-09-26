# Phase 7 — Private share snapshots QA

## Prerequisites

1. API and web running (`pnpm dev`).
2. `PERSISTENCE_DRIVER=memory` and `ACTIVE_SHARE_SNAPSHOT_VERSION=PRIVATE_SHARE_SNAPSHOT_V1`.
3. Authenticated user with moments recorded.

## Checks

- [ ] Preview shows exactly what will be shared before creation.
- [ ] Create returns a fragment link once; list never includes the raw token.
- [ ] Public `/en/shared#token` and `/ar/shared#token` resolve aggregates only.
- [ ] Locale switch on the public page preserves the fragment.
- [ ] Revoke makes resolve return unavailable immediately.
- [ ] Adding moments after create does not change an existing snapshot.
- [ ] POSITIVE_ONLY excludes difficult/net values.
- [ ] Notes, profile titles, and emails never appear in payloads.
- [ ] UI states that snapshots are immutable and not end-to-end encrypted.
- [ ] CSRF required for preview/create/revoke.
- [ ] No push/email/partner messaging introduced.

## Boundary

Phase 7 does **not** include partner accounts, invitations, comments, messaging, or email delivery of links.
