# Gentle actions and in-app smart nudges (Phase 5)

## Status

Accepted — Phase 5

## Context

Phase 4 provides descriptive observation codes from structured aggregates. Phase 5 adds optional, user-controlled gentle next-step suggestions derived from those same aggregates — without directing the user, judging the relationship, contacting a partner, or altering scores.

## Decisions

### Active nudge ruleset

- Identifier: `GENTLE_NUDGES_V1`
- Configured via `ACTIVE_NUDGE_RULESET` (reviewed IDs only; unknown values fail env validation)
- Code-owned rules; no environment JSON rule loading
- No AI/NLP/sentiment; notes are never read
- No Gottman 5:1; no clinical or healthy/unhealthy classifications
- Does not modify stored `scoreImpact` or `scoringVersion`
- Dismissal never negatively affects account, score, insights, or access

### Windows

- Same rolling semantics as Phase 4: `7d` / `30d` / `90d` (default `30d`)
- Home uses `30d`; Insights may request the selected window

### Response shape

API returns stable nudge and action **codes** only. English and Arabic dictionaries own user-facing copy. Generated prose is never stored.

### Suppression

- Durations: `1d` / `7d` / `30d`
- Stored as profile-scoped `NudgeSuppression` rows (or in-memory for local/tests)
- Active suppression yields `nudge: null` for that code until expiry

### API

- `GET /api/v1/nudges/current?window=…` — authenticated, active-profile scoped, `Cache-Control: no-store`
- `POST /api/v1/nudges/suppress` — CSRF required

## Consequences

- Home and Insights show optional gentle suggestions with hide controls
- In-app weekly reminders are covered in ADR 0008; email/push and sharing remain deferred
