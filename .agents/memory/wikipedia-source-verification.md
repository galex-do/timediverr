---
name: Verifying Wikipedia source URLs for dataset events
description: How to confirm a guessed Wikipedia article title/URL is real before citing it as a dataset event's source, and how to avoid getting rate-limited while doing so.
---

Guessing a Wikipedia URL from an event's topic often produces a 404 or lands on the wrong page, even when the guess seems obviously correct:
- Article titles don't always match the event name literally (e.g. "Battle of Al Mansurah (1250)" does not exist — the real title omits "Al": "Battle of Mansurah (1250)").
- Not every event has its own dedicated article; a plausible-sounding title (e.g. "Estates General of 1302") may not exist at all, with the content instead folded into a broader article (e.g. "Estates General (France)"). Citing the guessed title yields a hard 404.
- A title can also resolve to a redirect that lands on a thin/unrelated page (e.g. a town's article) rather than substantive coverage of the event — check the destination has real content, not just that it returns 200.

**How to apply:** Before finalizing a dataset's source list, verify every URL resolves with a 200 status, e.g. `curl -s -o /dev/null -w "%{http_code}" -A "Mozilla/5.0" "<url>"`. When one 404s, use the Wikipedia search API (`action=query&list=search&srsearch=...`) rather than re-guessing — it returns the actual titles. Also space out requests (`sleep 1-2` between calls) since Wikipedia's plain-HTTP endpoint starts returning 429 after only a handful of rapid requests from the same IP. A 429 on retry after a short wait is transient rate-limiting, not a dead link — don't drop or replace a source on that basis alone.

A general web search snippet on a contested "hard to believe" claim (name origins, ethnonym derivations, "X invented Y" trivia) is often a simplified or one-sided paraphrase. Before writing it into a dataset, fetch the specific Wikipedia article's own "Etymology"/"Name"/"Origins" section directly — it usually states the actual scholarly disagreement (e.g. multiple competing theories) that the search snippet flattened, letting you write an accurate, appropriately hedged sentence instead of an overclaim.

## Check coordinates against the article's geography

Do not copy Wikipedia infobox coordinates without checking that they match the place described in the article.

**Why:** The Aornos article displayed coordinates near Lahore while its prose discussed proposed sites near the upper Indus, including Pir Sar near Thakot. A real source page can still contain an unrelated or erroneous map coordinate.

**How to apply:** Cross-check the named region and nearby settlements before assigning a dataset marker. Where the ancient site is disputed, use a representative proposed-site marker with appropriate precision and explicitly qualify the location in both languages; do not imply that the marker is an excavated or securely identified site.
