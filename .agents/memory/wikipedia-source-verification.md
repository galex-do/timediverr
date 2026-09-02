---
name: Verifying Wikipedia source URLs for dataset events
description: How to confirm a guessed Wikipedia article title/URL is real before citing it as a dataset event's source, and how to avoid getting rate-limited while doing so.
---

Guessing a Wikipedia URL from an event's topic often produces a 404 or lands on the wrong page, even when the guess seems obviously correct:
- Article titles don't always match the event name literally (e.g. "Battle of Al Mansurah (1250)" does not exist — the real title omits "Al": "Battle of Mansurah (1250)").
- Not every event has its own dedicated article; a plausible-sounding title (e.g. "Estates General of 1302") may not exist at all, with the content instead folded into a broader article (e.g. "Estates General (France)"). Citing the guessed title yields a hard 404.
- A title can also resolve to a redirect that lands on a thin/unrelated page (e.g. a town's article) rather than substantive coverage of the event — check the destination has real content, not just that it returns 200.

**How to apply:** Before finalizing a dataset's source list, verify every URL resolves with a 200 status, e.g. `curl -s -o /dev/null -w "%{http_code}" -A "Mozilla/5.0" "<url>"`. When one 404s, use the Wikipedia search API (`action=query&list=search&srsearch=...`) rather than re-guessing — it returns the actual titles. Also space out requests (`sleep 1-2` between calls) since Wikipedia's plain-HTTP endpoint starts returning 429 after only a handful of rapid requests from the same IP.
