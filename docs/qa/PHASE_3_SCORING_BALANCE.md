# Phase 3 — Versioned scoring and relationship balance QA

## Prerequisites

1. API and web running (`pnpm dev`).
2. `PERSISTENCE_DRIVER=memory` (resets on API restart).
3. Authenticated user with completed onboarding.
4. At least a few positive and difficult moments recorded.

## Scoring

- [ ] New positive moment returns `scoreImpact: 1` and `scoringVersion: MVP_EQUAL_WEIGHT_V1`.
- [ ] New difficult moment returns `scoreImpact: -1`.
- [ ] Editing only the note preserves score fields.
- [ ] Editing kind/category updates score fields under the active policy.
- [ ] Deleting a moment changes the balance summary accordingly.
- [ ] Idempotent create retries return the original score (not a conflict).

## Balance API / home

- [ ] `/en/app` and `/ar/app` show relationship balance.
- [ ] Window switcher works for 7d / 30d / 90d / all.
- [ ] `all` has no previous-period change.
- [ ] Explanation copy is descriptive and non-diagnostic.
- [ ] No private notes appear in the balance card.
- [ ] Arabic uses calm wording (رصيد العلاقة, المساهمة الإيجابية/الصعبة, صافي الرصيد).

## Explicit Phase 3 boundary

Do **not** expect insights, smart nudges, Gottman ratio scoring, prototype weights (+8/−7), or relationship health classifications. Those remain later phases.
