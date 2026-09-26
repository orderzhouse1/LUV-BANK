# Phase 5 — Gentle nudges QA

## Prerequisites

1. API and web running (`pnpm dev`).
2. `PERSISTENCE_DRIVER=memory` and `ACTIVE_NUDGE_RULESET=GENTLE_NUDGES_V1`.
3. Authenticated user with onboarding complete.

## Checks

- [ ] Home (`/en/app`, `/ar/app`) shows an optional nudge for the `30d` window.
- [ ] Insights nudge follows the currently selected insight window (`7d` / `30d` / `90d`).
- [ ] Nudge and action copy render from dictionaries (EN LTR, AR RTL).
- [ ] Suppress for 1d / 7d / 30d hides the current nudge without changing balance or insights.
- [ ] Suppress requires CSRF; unauthenticated access is rejected.
- [ ] Responses use `Cache-Control: no-store`.
- [ ] Private notes never appear in nudge payloads.
- [ ] No “must”, streak pressure, points for actions, Gottman 5:1, or clinical labels.

## Boundary

Phase 5 does **not** include reminder scheduling, email/push delivery, share links, partner accounts, or AI.
