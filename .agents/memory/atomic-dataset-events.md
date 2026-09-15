---
name: Atomic dataset events, tag-chained narratives, cross-file duplication checks
description: Structural rule for writing historical dataset events so a tag/map-filtered timeline reads clearly, plus how to catch cross-file duplicate events.
---

## Atomic events, not multi-year biographies
A single event entry must have one date, one place, one specific happening. Do not compress a person's whole career or a multi-year arc ("X's rise and fall", "X does A, then B, then C over 20 years") into one entry — when the app's map/timeline is filtered by tag or scanned chronologically, a compressed entry reads as an "intriguing header" with no clear what/where, and it breaks "same place"/"same time" map clustering since it can only carry one lat/long and one date.

**How to apply:** When a subject's story spans multiple distinct happenings (e.g. a khan's conversion, a war, then an alliance), split it into one atomic event per happening, each with its own accurate date and coordinates (not a reused placeholder location), and link them with a consistent per-person tag (e.g. "Berke Khan 👑") so the app can surface the full chain. Titles follow "Subject + concrete verb + specific object/place" (e.g. "Хан Узбек обращает Золотую Орду в Ислам"), not a poetic/Werber-style hook. More, shorter atomic events are preferable to fewer compressed ones.

## Multi-actor compound events are also a violation
The "one date, one place, one happening" rule isn't just about one person's multi-year arc — it's equally violated by bundling several different named actors' distinct actions (even if each is brief and they fall within the same few months) into one entry. A crisis with 2-3 clearly separate actors — an invasion, then a rival's opportunistic power grab, then a third party's punitive response — is 2-3 events, not one, even if it reads as a single "story."

**How to apply:** If a draft event's description names more than one independent actor each doing their own distinct thing (not one continuous campaign by a single actor/army), split it into one event per actor's action, each with its own accurate date, even when the actions are causally chained within a short window (e.g. a Mamluk raid, the rival Turkmen coup it triggers, and the overlord's reprisal against both — three atomic events, not one "crisis of year X").

## Cross-file duplicate events
Before finalizing a rewritten or new dataset file, grep sibling dataset files (same region and neighboring era files) for key entity/battle names appearing in your new events (e.g. a battle name, a person's marriage, a treaty). A different file can already have a dedicated event for the same happening — remove the new duplicate and let the existing file's event cover it (other events may still reference it in passing prose without re-listing it as its own entry).

**Why:** caught concretely when adding "Battle of Kulikovo" (8 Sept 1380) as a new event to a Golden Horde file — an identical dedicated event already existed in the neighboring Mongol Empire era file with the same date.
