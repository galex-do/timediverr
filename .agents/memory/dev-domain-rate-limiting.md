---
name: Dev-domain rate limiting and how it presents in this app
description: Why bursts of app requests trigger Replit's dev-domain 429s, and the client-side patterns that turn a transient 429 into a visible outage.
---

## The platform behavior
Replit's dev domain applies its own infra-level rate limiting (429 Too Many Requests) when a workspace makes a burst of requests in a short window. This is not configurable from application code and is unrelated to any app-level rate limiter — timediverr's Go backend has no IP/rate-limiting middleware at all (checked `backend/pkg/middleware/` and grepped the whole backend).

**Why:** confirmed via Replit's own docs (`searchReplitDocs`): 429s on a dev domain mean the *app itself* is making too many requests/connections in a window, not that a quota needs raising.

**How to apply:** when a user reports being logged out or seeing data disappear specifically during heavy interactive use (not at a fixed schedule), suspect (1) client code treating a transient 429/5xx as a fatal auth/data error, and (2) a repeated action that triggers a much larger request than necessary.

## Patterns that turn a 429 into a visible bug (found and fixed once already)
- Any code that does `if (!response.ok) { logout()/clearData() }` without checking the actual status is a landmine — a transient 429 gets treated the same as a real 401/expired session. Only treat 401 as "invalid session"; treat 429/5xx/network errors as transient and keep existing state.
- A "refetch the entire list" pattern after every single-item edit (e.g. an admin table doing `fetchAllEvents({ includeDescriptions: true })` after saving one record's tags) is the kind of thing that turns ordinary editing into the request bursts that trip the platform's rate limiter. Prefer patching the one changed item into local state (merge the mutation response with already-cached related data, e.g. resolving tag IDs against an already-loaded tag catalog) instead of a full reload.
- A fetch's error handler that unconditionally does `list.value = []` on failure will wipe already-good on-screen data the moment any transient error occurs. Only clear to empty on a genuine first-load failure; keep prior data on a refetch failure and surface the error separately.
- A lightweight mitigation: retry once on a 429 with a short backoff (honor `Retry-After` if present) before surfacing it as a real error — smooths over the platform's transient throttling without adding to the request burst.
