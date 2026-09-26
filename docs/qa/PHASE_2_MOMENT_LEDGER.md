# Phase 2 — Private moment ledger QA

## Prerequisites

1. API and web running locally (`pnpm dev`).
2. `PERSISTENCE_DRIVER=memory` in `.env` (data resets when the API restarts).
3. Authenticated session (register/login).
4. Onboarding complete (active relationship profile).

## Create moment

- [ ] Open `/en/app/log` and `/ar/app/log`.
- [ ] No category is selected by default.
- [ ] Positive and difficult kinds are distinguishable by label/icon, not color alone.
- [ ] Category cards expose accessible names; keyboard focus is visible.
- [ ] Submit stays disabled/pending during save; double-click does not create duplicates.
- [ ] Optional note accepts plain text; empty note saves cleanly.
- [ ] “Just now” and custom date/time both work; future times are rejected.
- [ ] Success confirmation appears; new moment shows on home/history without fake optimistic data.

## History / filters

- [ ] `/en/app/history` and `/ar/app/history` list moments newest first.
- [ ] Kind, category, and date filters work; clear filters resets the list.
- [ ] Load more paginates without duplicates or skips.
- [ ] Empty and error states are recoverable.

## Edit / delete

- [ ] Edit dialog validates final kind/category pairing.
- [ ] Save/Cancel and pending states behave correctly.
- [ ] Delete confirmation explains that the note is removed and cannot be undone.
- [ ] After delete, the moment disappears; filters remain where practical.

## RTL / mobile

- [ ] Arabic pages use RTL reading and focus order.
- [ ] Check ~320 / 375 / 768 / desktop widths: no horizontal overflow; bottom nav does not cover content.
- [ ] Desktop does not show mobile bottom bar; mobile does not show desktop rail.
- [ ] Long notes wrap; dialogs stay in viewport.

## Explicit Phase 2 boundary

Scoring is **not** part of Phase 2. Do not expect balances, ratios, weights, trend charts, Gottman claims, or sample values such as `+128`.
