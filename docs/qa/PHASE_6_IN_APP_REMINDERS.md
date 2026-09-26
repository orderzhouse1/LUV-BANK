# Phase 6 — In-app weekly reminders QA

## Prerequisites

1. API and web running (`pnpm dev`).
2. `PERSISTENCE_DRIVER=memory`.
3. Authenticated user with onboarding complete.

## Delivery limitation (must remain accurate)

Reminders appear **only inside Luv Bank** when the app is opened after the scheduled time. There is no push, email, SMS, browser notification, or background delivery.

## Checks

- [ ] Reminder is disabled by default until the user explicitly enables and saves.
- [ ] User can choose purpose, weekday, local time, and IANA timezone.
- [ ] Device timezone can be suggested via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- [ ] Next availability time is shown after enable.
- [ ] Due reminder appears on Home after `nextDueAt`.
- [ ] Dismiss advances to the next weekly occurrence.
- [ ] Snooze 1h / 1d hides the due card temporarily.
- [ ] CSRF required for PUT/dismiss/snooze.
- [ ] EN LTR / AR RTL copy for purposes and weekdays.
- [ ] Responses use `Cache-Control: no-store`.
- [ ] No effect on balance, insights, or nudges.
- [ ] UI states that push/email are not enabled.

## Boundary

Phase 6 does **not** include email, push, browser notifications, service workers, share links, or partner messaging.
