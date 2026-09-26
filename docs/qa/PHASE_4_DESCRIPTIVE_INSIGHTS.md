# Phase 4 — Descriptive insights QA

## Prerequisites

1. API and web running (`pnpm dev`).
2. `PERSISTENCE_DRIVER=memory` and `ACTIVE_INSIGHT_RULESET=DESCRIPTIVE_INSIGHTS_V1`.
3. Authenticated user with onboarding complete and several moments across days.

## Checks

- [ ] `/en/app/insights` and `/ar/app/insights` load descriptive summaries.
- [ ] Window switcher works for 7d / 30d / 90d (no “all”).
- [ ] Trend buckets render without fake loading values.
- [ ] Observation copy is descriptive and non-diagnostic in English and Arabic.
- [ ] Category frequency uses translated labels, not raw codes only.
- [ ] Private notes never appear in insights responses or UI copy from the API.
- [ ] No Thriving/Steady/Struggling, Gottman 5:1, or “healthy/toxic” claims.

## Boundary

Phase 4 does **not** include recommendations, smart nudges, reminders, sharing, or AI.

> Note: Phase 5 adds optional gentle nudges separately (`docs/qa/PHASE_5_GENTLE_NUDGES.md`).
