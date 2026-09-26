# Descriptive trends and reflective insights (Phase 4)

## Status

Accepted — Phase 4

## Context

Phase 3 provides scored moments and relationship balance. Phase 4 adds on-demand descriptive observations and rolling trend buckets derived from the same private ledger — without advice, nudges, or clinical classification.

## Decisions

### Active insight ruleset

- Identifier: `DESCRIPTIVE_INSIGHTS_V1`
- Configured via `ACTIVE_INSIGHT_RULESET` (reviewed IDs only; unknown values fail env validation)
- Code-owned rules; no environment JSON rule loading
- No AI/NLP/sentiment; notes are never read
- No Gottman 5:1; no Thriving/Steady/Struggling/Intimacy/Passion/Commitment labels

### Windows and buckets

- Windows: rolling `7d` / `30d` / `90d` (no `all` for trends)
- Buckets: 7×1d, 10×3d, 15×6d covering the selected period exactly
- Interval rule: `[startsAt, endsAt)` with the final bucket inclusive of `generatedAt`
- UTC internally; localized labels only on the client

### Observation codes

API returns structured `{ code, parameters }` only. Web dictionaries translate and format them. Insights are never persisted.

### API

`GET /api/v1/insights/summary?window=…` — authenticated, active-profile scoped, `Cache-Control: no-store`, no notes.

## Consequences

- Insights page shows trend buckets, observations, and category frequency
- Gentle nudges are covered in ADR 0007; reminders and sharing remain deferred
