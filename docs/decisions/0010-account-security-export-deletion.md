# Account security, data export, and permanent deletion (Phase 8)

## Status

Accepted — Phase 8

## Context

Phases 1–7 provide authenticated ownership, a private ledger, scoring, insights, nudges, reminders, and expiring share snapshots. Phase 8 adds user-controlled session management, password change, personal-data export, and immediate permanent account deletion — without soft-delete queues, email confirmation, or admin tooling.

## Decisions

### Step-up password verification

- Required for: personal-data export, password change, permanent account deletion.
- Not required for: listing sessions, revoking a session, revoking all shares, hard-deleting one share snapshot.
- Verification uses the existing Argon2id `verifyPassword` path.
- Invalid current password returns stable `CURRENT_PASSWORD_INVALID`.
- Step-up mutations are rate-limited with the auth rate-limit window/max.
- Passwords are never trimmed, logged, or compared as hashes in application code.

### Export format

- Stable code-owned identifier: `LUV_BANK_DATA_EXPORT_V1` (no environment variable).
- Explicit Zod DTO — not raw Prisma rows.
- Includes private notes (personal-data export) and safe session metadata.
- Excludes `passwordHash`, JWTs, `refreshTokenHash`, CSRF/cookie values, raw share tokens, `tokenHash`, secrets, fingerprints, and internals.
- `reminderOccurrences` is always `[]` in V1 (Phase 6 has no occurrence table).

### Immediate hard deletion

- Requires current password + confirmation phrase `DELETE_MY_ACCOUNT`.
- Deletes the user and owned profiles, moments/notes, sessions, nudge suppressions, reminder preferences, and share snapshots immediately.
- Public bearer links become unavailable because snapshot records are gone.
- Auth cookies are cleared; UI redirects to a neutral public confirmation page.
- No soft-delete tombstone with personal account information.
- The same normalized email may register again later.

### Sessions

- List returns safe metadata and marks the current session via access-token `sid`.
- Revoking the current session clears cookies and signs the client out.
- Revoking another session leaves the current session intact.

## Consequences

- Settings (`/app/settings`) becomes the account-security surface.
- Scoring, insights, nudges, and reminders remain independent of these controls.
- Partner accounts, social login, email verification, password-reset email, 2FA, and external notification delivery remain deferred.
