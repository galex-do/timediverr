---
name: Valid event lens types
description: The exact set of valid event type values the backend accepts on import — no others are accepted.
---

Valid types (6 total):
- `historic`
- `political`
- `military`
- `cultural`
- `religious`
- `scientific`

**Why:** The backend `validLensTypes` map in `event_handler.go` enforces this strictly — any other value causes the event to be silently skipped on import. `battle` was once added by mistake and removed; all battle events use `military`.

**How to apply:** Every event in every dataset must have one of these six values. Battle events → `military`. Never invent new types.
