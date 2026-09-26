# Phase 8 — Account security, data export, and permanent deletion QA

## Prerequisites

1. API and web running (`pnpm dev`).
2. `PERSISTENCE_DRIVER=memory`.
3. Authenticated, onboarded user with at least one moment and one share snapshot preferred.

## Checks

- [ ] Settings lists sessions and marks the current device.
- [ ] Revoking another session leaves this device signed in.
- [ ] Revoking the current session signs out and clears auth cookies.
- [ ] Password change requires the current password and accepts a ≥12-character new password.
- [ ] Wrong current password returns `CURRENT_PASSWORD_INVALID` for export / password / delete.
- [ ] Export download is `LUV_BANK_DATA_EXPORT_V1`, includes private notes, and excludes hashes/tokens/secrets.
- [ ] Deletion summary shows counts before delete.
- [ ] Revoke-all shares makes public resolve unavailable without deleting the row.
- [ ] Permanent share delete removes the stored record from the list.
- [ ] Account delete requires password + `DELETE_MY_ACCOUNT`, clears cookies, and lands on `/account-deleted`.
- [ ] After deletion, `/auth/me` fails and public share resolve fails.
- [ ] The same email can register again after hard delete.
- [ ] CSRF required for all account mutations.
- [ ] Private responses remain `Cache-Control: no-store`.
- [ ] No tokens or export contents are stored in localStorage/sessionStorage.
- [ ] Scoring, insights, nudges, and reminders are not altered by these controls themselves.
- [ ] `/en` remains LTR and `/ar` remains RTL on settings and account-deleted.

## Boundary

Phase 8 does **not** include partner accounts, social login, email verification, password-reset email, 2FA, delayed deletion queues, soft-delete tombstones, or admin-initiated deletion.
