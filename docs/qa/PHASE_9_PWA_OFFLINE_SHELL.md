# Phase 9 — PWA foundation and privacy-safe offline shell QA

## Prerequisites

1. Production web build (`pnpm --filter @luv-bank/web build`) so `/sw.js` is generated and registration is enabled.
2. API running for authenticated flows.
3. Prefer a Chromium-based browser with Application / Manifest tools.

## Checks

- [ ] `/en/manifest.webmanifest` and `/ar/manifest.webmanifest` return localized manifests with shared `id`.
- [ ] Manifest `start_url` values are `/en/app` and `/ar/app`.
- [ ] Icons render for install / home-screen flows; maskable icon present.
- [ ] Service worker registers only in production (or with `NEXT_PUBLIC_PWA_ENABLE=true`).
- [ ] `/sw.js` is served with `Cache-Control: no-cache` and `Service-Worker-Allowed: /`.
- [ ] Going offline shows the bilingual offline banner and does not imply sign-out.
- [ ] Navigating while offline serves the generic EN/AR offline document (not a stale private page).
- [ ] Mutations while offline fail safely with no optimistic success and no automatic retry queue.
- [ ] Cache Storage contains only allowlisted static/offline/pwa assets — no API JSON, notes, exports, or share payloads.
- [ ] Settings install control is user-initiated and restrained.
- [ ] No notification permission prompt appears.
- [ ] Desktop and mobile shells remain different.
- [ ] `/en` remains LTR and `/ar` remains RTL.
- [ ] Auth cookies, CSRF, ownership, deletion, and share privacy protections remain unchanged.

## Boundary

Phase 9 does **not** include push notifications, Background Sync, offline write queues, partner accounts, AI, deployment, or live Neon integration.
