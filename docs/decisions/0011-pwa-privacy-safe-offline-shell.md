# PWA foundation and privacy-safe offline shell (Phase 9)

## Status

Accepted — Phase 9

## Context

Phases 1–8 deliver a private, authenticated relationship ledger with exports and hard deletion. Phase 9 adds installability and a narrow offline shell without turning Luv Bank into an offline private-data app.

## Decisions

### Installable bilingual manifests

- Locale routes: `/en/manifest.webmanifest` and `/ar/manifest.webmanifest`
- Shared stable `id: "/"` so English and Arabic do not install as unrelated apps
- Localized `name`, `short_name`, `description`, `lang`, `dir`, and `start_url` (`/en/app`, `/ar/app`)
- `display: "standalone"` with brand theme/background colors
- Safe shortcuts only: Home, Record a moment, History, Insights

### Icons

- Interim SVG mark retained at `/pwa/mark.svg`
- Generated PNG set including maskable and Apple touch icons under `/pwa/icons/`
- Not claimed as final client-approved branding

### Privacy-safe service worker

- Custom `/sw.js` (no broad Workbox/next-pwa private-page caching preset)
- Scope `/` with `Service-Worker-Allowed: /` and `Cache-Control: no-cache` on the worker script
- Registers in production builds, or when `NEXT_PUBLIC_PWA_ENABLE=true`
- Cache version via `PWA_CACHE_VERSION` (default `phase-9-v1`) injected at web prebuild

### Allowed caching only

- Generic offline HTML (`/pwa/offline-en.html`, `/pwa/offline-ar.html`)
- `/pwa/**` brand/icon assets
- Same-origin `/_next/static/**`
- Navigations are network-only and never written to Cache Storage
- No `/api/**`, RSC (`_rsc`), `/_next/image`, non-GET, `no-store`/`private`, or `Set-Cookie` responses

### No offline mutations / no notifications

- API mutations fail closed while offline; no queue, Background Sync, or automatic replay
- No Notification API, PushManager, FCM, APNs, VAPID, or push handlers
- Weekly reminders remain in-app only

## Consequences

- Desktop and mobile shells remain intentionally different in one codebase
- Offline UX is honest: reconnect to load or change private information
- Push delivery and full offline private ledgers remain deferred
