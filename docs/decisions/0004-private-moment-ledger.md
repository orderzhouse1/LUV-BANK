# Private moment ledger (Phase 2)

## Status

Accepted — Phase 2

## Context

Phase 1 authenticated users and an active relationship profile. Phase 2 adds a private, user-owned moment ledger scoped to that active profile. Scoring, ratios, trends, and insights remain deferred.

## Decisions

### Active-profile ownership

- Every moment operation resolves the authenticated user’s **active** relationship profile server-side.
- Clients never supply `userId`, `ownerId`, or `relationshipProfileId` for ownership.
- Queries always include the profile ownership boundary. Cross-user or unknown IDs return the same `MOMENT_NOT_FOUND` response.

### Stable category codes (no weights)

Positive: `AFFECTION`, `APPRECIATION`, `QUALITY_TIME`, `SUPPORT`, `SHARED_JOY`, `THOUGHTFUL_GESTURE`

Difficult: `TENSION`, `FELT_UNHEARD`, `FELT_OVERLOOKED`, `ARGUMENT`, `EMOTIONAL_DISTANCE`, `HARSH_EXCHANGE`

- Codes are API/domain identifiers; labels live in web dictionaries only.
- No `MomentCategory` table; no numeric weights or scores in Phase 2.
- Server validates kind ↔ category pairing (`CATEGORY_KIND_MISMATCH`).

### UTC occurrence storage

- `occurredAt` is stored as UTC `DateTime`.
- Omitted on create → server current time.
- Materially future timestamps rejected (≈5 minute clock-skew tolerance).
- Display uses locale-aware `Intl.DateTimeFormat`.

### Cursor pagination

- `GET /moments` uses opaque cursors ordered by `occurredAt DESC`, then `id DESC`.
- Default limit 20, max 50; `nextCursor` only when another page exists.

### Idempotent creation

- Client sends `clientMutationId` (UUID) per logical submit.
- Unique on `(relationshipId, clientMutationId)`.
- Same mutation ID + same logical payload → existing moment.
- Same mutation ID + different payload → `IDEMPOTENCY_CONFLICT`.
- Logical payload fingerprint excludes server-defaulted clock noise when `occurredAt` was omitted.

### Hard deletion

- Phase 2 uses hard delete. Private notes are not retained for analytics after delete.

### Privacy / caching

- Authenticated moment responses send `Cache-Control: no-store`.
- Notes are plain text; never logged; never rendered via `dangerouslySetInnerHTML`.
- No ledger persistence in `localStorage` / `sessionStorage`.

### Persistence drivers

- `PERSISTENCE_DRIVER=memory` — local/dev/tests only; resets on process restart.
- `PERSISTENCE_DRIVER=prisma` — requires `DATABASE_URL` and applied migrations.
- Production **rejects** memory mode at env validation.
- Never silently fall back from Prisma to memory.
- No Neon migration has been applied in this phase; Prisma repository code is generated/typechecked but live DB tests remain blocked.

## Consequences

- Web home/log/history are functional ledger screens without scores.
- Phase 3 may add weights, balances, and ratios without changing category codes.
