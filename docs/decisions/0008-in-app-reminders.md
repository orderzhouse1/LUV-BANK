# User-scheduled in-app reminders (Phase 6)

## Status

Accepted — Phase 6

## Context

Phase 5 provides optional data-derived nudges. Phase 6 adds an explicitly user-configured weekly **in-app** reminder preference owned by the active relationship profile. Reminders are independent of balance, insights, and nudges.

## Decisions

### Delivery mode

- Identifier: `IN_APP_CHECK`
- The reminder becomes available when the authenticated app checks the reminder API at or after `nextDueAt`
- No push, email, SMS, browser notification, service worker, background worker, or calendar event
- UI/README/QA must state this limitation clearly

### Cadence

- Only `WEEKLY`
- One active preference per active relationship profile
- Disabled by default; created only after explicit save/opt-in

### Purpose codes

- `PRIVATE_WEEKLY_CHECK_IN`
- `RECORD_WHEN_READY`
- `REVIEW_RECENT_MOMENTS`

Copy lives in EN/AR dictionaries. No translated prose is stored in the database.

### Schedule fields

- `weekday` (`MONDAY`…`SUNDAY`)
- `localHour` / `localMinute` (0–23 / 0–59)
- IANA `timezone`
- Server-owned UTC `nextDueAt`
- Optional `snoozedUntil` for 1h / 1d snooze

### Timezone library

- `@js-temporal/polyfill`
- DST: `disambiguation: "compatible"` (spring-forward → next valid instant; fall-back → earlier occurrence)
- Injectable `now` in services/tests; no real-time sleeps

### API

- `GET /api/v1/reminders/preference`
- `PUT /api/v1/reminders/preference` (CSRF)
- `POST /api/v1/reminders/dismiss` (CSRF)
- `POST /api/v1/reminders/snooze` (CSRF)
- Active-profile ownership; `Cache-Control: no-store`

## Consequences

- `/app/reminders` configures the weekly preference
- Home shows a due reminder card when available
- Private share snapshots are covered in ADR 0009; email/push and partner accounts remain deferred
