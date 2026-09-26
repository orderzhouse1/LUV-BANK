# Cookie, CORS, and CSRF baseline

## Status

Accepted — Phase 1 implemented

## Context

Relationship notes are sensitive. Authentication will use JWT access tokens with HttpOnly refresh/session cookies. Local development and production deployment need a clear cookie domain, CORS credentials, and CSRF model before auth ships.

## Intended production shape (same-site)

Prefer a same-site deployment such as:

- Web: `https://example.com` or `https://app.example.com`
- API: `https://api.example.com`

When web and API share a registrable domain, cookies can use an intentional parent `Domain` attribute if required. Exact production cookie domain, CORS allowlist, and CSRF strategy must be confirmed before launch.

## Local development (host-only cookies)

- Leave `COOKIE_DOMAIN` empty so browsers treat cookies as **host-only** for `localhost`.
- Do **not** set `COOKIE_DOMAIN=localhost` (invalid / unreliable for host-only local cookies).
- `COOKIE_SECURE=false` and `COOKIE_SAME_SITE=lax` for local HTTP.
- `CORS_ORIGINS` includes `http://localhost:3000` with `credentials: true` on the API.

## CSRF and auth

Cookie-based authentication uses JWT access/refresh HttpOnly cookies plus a double-submit CSRF cookie and Origin checks. See `0003-auth-cookies-csrf-ownership.md` for the Phase 1 implementation details.

## Consequences

- Phase 0 API enables strict configurable CORS and Helmet without auth middleware.
- Phase 1 must implement session cookies, CSRF, and ownership checks before any private relationship data is exposed.
