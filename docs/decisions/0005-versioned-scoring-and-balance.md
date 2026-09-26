# Versioned scoring and relationship balance (Phase 3)

## Status

Accepted — Phase 3

## Context

Phase 2 stores private moments without scores. Phase 3 adds a deterministic, versioned scoring policy and a relationship balance derived from the active profile’s moment ledger.

## Decisions

### Active scoring policy

- Identifier: `MVP_EQUAL_WEIGHT_V1`
- Every positive category contributes `+1`
- Every difficult category contributes `-1`
- Equal magnitude within each kind; no category-specific weights
- Notes do not affect scoring
- No NLP, AI, decay, streaks, or hidden modifiers
- This is a product-owned MVP rule — not a clinical or scientific claim

### Grandfathered stored scores

Each moment stores `scoreImpact` and `scoringVersion`:

1. **Create** — evaluate with the active policy; persist both fields.
2. **Edit note or occurredAt only** — preserve existing score fields.
3. **Edit kind or categoryCode** — re-evaluate with the _currently active_ policy and update both fields.
4. Existing moments are not auto-rescored when a future policy is introduced.
5. Explicit re-scoring migrations are out of scope for Phase 3.
6. **Delete** removes the moment’s contribution from future balance calculations.

### Idempotency

Create fingerprint remains `kind|category|note|clientOccurredAt`. Score fields are excluded so retries after a policy change still return the original scored moment without `IDEMPOTENCY_CONFLICT`.

### Balance aggregation

- Source of truth: scored moments on the active relationship profile
- Windows: rolling `7d` / `30d` / `90d` / `all` (UTC instants)
- Contributions:
  - `positiveContribution` = sum of positive impacts
  - `difficultContribution` = absolute sum of negative impacts
  - `netBalance` = signed sum
- Fixed windows include an equal-length previous period and `changeFromPrevious.netBalance`
- `all` has null previous/change
- No “healthy” / “dangerous” classifications

### API

`GET /api/v1/balance/summary?window=…` — authenticated, active-profile scoped, `Cache-Control: no-store`, no notes.

### Persistence / migration

- Prisma schema includes required `scoreImpact` and `scoringVersion`
- No Neon migration applied; future backfill assumption for any pre-Phase-3 rows: `+1`/`-1` + `MVP_EQUAL_WEIGHT_V1`
- Memory repositories store Phase 3 fields directly

## Consequences

- Home shows a bilingual balance with calculation explanation
- Insights, nudges, ratios-as-verdicts, and partner scoring remain deferred
