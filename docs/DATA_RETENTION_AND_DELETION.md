# Data retention and deletion (Phase 8+)

## Status

Accepted operational policy for the current MVP.

## Account deletion

- Deletion is **immediate and permanent** after password re-authentication and the confirmation phrase `DELETE_MY_ACCOUNT`.
- Removed: user account, owned relationship profiles, moments and private notes, authentication sessions, nudge suppressions, reminder preferences, and share snapshots.
- Public share bearer links become unavailable because snapshot records are deleted.
- No soft-delete tombstone retaining personal account information.
- The same normalized email may register again later as a new account.
- LUV BANK does not retain private application data in Neon after hard deletion in the intended production model.

## Personal-data export

- Export format: `LUV_BANK_DATA_EXPORT_V1`.
- Generated on demand after current-password verification.
- Delivered to the authenticated user as a downloadable JSON payload.
- Export contents are **not** retained as a server-side archive, analytics event, or monitoring payload.
- Export includes private notes because it is the user’s personal-data copy.
- Export excludes password hashes, JWTs, refresh-token hashes, CSRF/cookie values, raw share tokens, and `tokenHash`.

## Operational logs

- Request metadata may remain in ordinary operational logs.
- Logs must not retain private notes, passwords, export JSON bodies, raw tokens, or CSRF secrets.

## Offline / PWA (Phase 9)

- The service worker must not persist private relationship data for offline access.
- Offline fallback pages are generic and do not contain account contents.
