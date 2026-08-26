---
name: Rate limiting in timediverr — two separate mechanisms, don't conflate them
description: This project has real nginx rate limiting in its docker-compose deployment as well as Replit's unrelated dev-domain throttling — check which environment the user means before diagnosing "rate limit" reports.
---

## Two distinct things named "rate limit" in this project — ask/check which one first
1. **Real app-level rate limiting**: `frontend/nginx.conf`, used only by the docker-compose deployment (`docker-compose.yml` builds `frontend/Dockerfile`, which `COPY`s this nginx.conf as the container's whole nginx config; nginx proxies `/api/` to the backend). Three `limit_req_zone`s (`api_general`, `api_batch`, `api_heartbeat`) throttle by client IP. This is the only rate limiter in the entire codebase — the Go backend itself (`backend/pkg/middleware/`) has none.
2. **Replit's dev-domain infra throttling**: an unrelated, unconfigurable 429 from Replit's own proxy when the *Replit workspace* (not docker-compose) gets a request burst. Only relevant when the user is working in the Replit preview/dev domain, not when they've deployed the docker-compose stack elsewhere.

**Why this matters:** a user reporting "I hit a rate limit" may mean either one, and the fixes are unrelated. I once wrongly assumed Replit's dev-domain throttling when the user actually meant the nginx limiter in their self-hosted docker-compose deployment — wasted a diagnostic pass. **How to apply:** ask (or check how they're running the app) before diagnosing; if they mention docker/docker-compose/self-hosting/a local deployment outside the Replit preview, go straight to `frontend/nginx.conf`.

## The nginx limiter's tuning history
Original limits (`api_general: 15r/m burst=10`, `api_batch: 60r/m burst=20`, `api_heartbeat: 10r/m burst=5`) were sized for read-only browsing, not admin/editing work — a couple of tag edits (2 requests each: update + set-tags) plus normal page-load fetches (events/tags/template-groups) exhausted the burst pool, then only refilled one request per several seconds, causing legitimate `/api/events` and `/api/tags` calls to 503 ("events stop appearing") even with a single operator doing nothing abusive.

Raised to `api_general: 60r/m burst=20`, `api_batch: 120r/m burst=40`, `api_heartbeat: 30r/m burst=10` (user picked these final numbers explicitly over an initial, more generous first pass — respect these as the current baseline rather than re-deriving from scratch). `nginx.conf` is baked into the frontend image at build time (no envsubst templating), so a limit change requires rebuilding: `docker compose build frontend && docker compose up -d frontend` (or a full `docker compose up -d --build`).

## Frontend request-volume issues found alongside this (general lesson, not nginx-specific)
- `AdminEvents.vue` used to refetch the *entire* event list (thousands of records, full descriptions) after every single event/tag edit or delete — replaced with patching just the changed event into local state via `useEvents.js`'s `handleEventCreated`/`handleEventUpdated`/`handleEventDeleted`, resolving tags client-side from the already-loaded tag catalog (`getTagsByIds`) instead of a network call.
- `useEvents.js`'s fetch error handler used to blank the events list on *any* failure, even a transient one on a refetch. Now only clears to empty on a genuine first-load failure (`!eventsLoaded.value`); a refetch failure keeps whatever was already on screen.
- `authService.js`'s `getCurrentUser()` used to log the user out on *any* non-OK `/api/auth/me` response. Now only treats an actual `401` as an invalid session; other statuses (429/5xx/network) keep the existing session.
- `api.js`'s `makeRequest` now retries once on a 429 with a short backoff (honoring `Retry-After` if present) before surfacing it as an error.
