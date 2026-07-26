---
name: Dataset event structure
description: Required fields for every event in every JSON dataset, and dataset-level requirements. Missing any field produces a broken dataset.
---

## Top-level dataset object

```json
{
  "description": "one paragraph in English describing the dataset scope",
  "filename": "AD1_something.json",          ← must match the actual filename
  "events": [ ... ]
}
```

## Required fields on every event (11 total)

| Field | Type | Notes |
|---|---|---|
| `date` | string | Format `DD.MM.YYYY` — always zero-padded. Unknown day/month → `01` |
| `era` | string | `"AD"` or `"BC"` |
| `type` | string | **Exactly one of:** `historic`, `political`, `military`, `cultural`, `religious`, `scientific` |
| `name` | string | English event name, lowercase (except proper nouns) |
| `name_ru` | string | Russian translation of the name |
| `description` | string | English prose, 150–400 words |
| `description_ru` | string | Russian translation of the description |
| `latitude` | float | Decimal degrees. Place at the most relevant location for the event |
| `longitude` | float | Decimal degrees |
| `source` | string | A real, existing Wikipedia URL (`https://en.wikipedia.org/wiki/...`). Must be verifiable — never invent a URL. Use `""` only if no relevant Wikipedia article exists |
| `tags` | array of strings | See tag conventions below |

**`geo` arrays are WRONG.** Use separate `latitude` / `longitude` float fields.

## Tag conventions

- Reuse existing tags wherever possible (check the full tag list before inventing new ones)
- New tags are fine for clear regional/cultural concepts (`Anglo-Saxon`, `Plantagenet`, `Mongolian`, etc.) if they will be used in multiple events (≥ 2 uses in the dataset)
- Single-use invented tags should be replaced with an existing tag of similar meaning
- Tags are proper-case strings (`"War"`, `"Battle"`, `"Christian"`, not `"war"`)

## Valid `type` values

`historic` · `political` · `military` · `cultural` · `religious` · `scientific`
(`battle` is NOT valid — use `military`)

## Source URL rule

- Must point to a real, existing Wikipedia page
- Do NOT invent or hallucinate URLs
- Test mentally: "does this Wikipedia article actually exist?"
- If uncertain, use a broader article (e.g. the article on the king rather than the specific battle, if the battle article may not exist)
- Use `""` only as a last resort when no plausible Wikipedia page covers the event

## Common mistakes that produce broken datasets

1. Using `geo: [[lon, lat]]` instead of `latitude` / `longitude` float fields
2. Missing `name_ru` or `description_ru` (Russian translations are required)
3. Missing `source` field entirely
4. Missing top-level `filename` field
5. Inventing Wikipedia URLs that do not exist
6. Using `type: "battle"` instead of `type: "military"`
7. Starting new tags that are used only once in the whole dataset
8. **Using any `era` value other than `"AD"` or `"BC"`** — values like `"medieval"`, `"ancient"`, `"prehistoric"` are silently rejected by the import handler and those events are skipped without error
