---
name: Description length balance
description: English and Russian descriptions should be symmetric in length; English should be moderately concise.
---

## Rule
English descriptions: ~130–170 words. Detailed but not exhaustive — two clear paragraphs using `\n\n`.
Russian descriptions: must be symmetric with English — same relative depth, same paragraph structure, same word-count ratio. Never just a summary of the English.

## Why
The user noticed Russian text was appearing ~2× shorter than English, which looks uneven on the map timeline UI.
The fix applied to BC1_wales.json (2025-07-26): trimmed English from 200–300 words to 130–170, and expanded Russian to match.

## How to apply
When writing a new dataset, draft English first at ~150 words. Write Russian to match the same coverage and structure — not as a summary. Before saving, spot-check 3–4 events to confirm word counts are within ~15% of each other.
