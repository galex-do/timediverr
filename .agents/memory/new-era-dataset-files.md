---
name: Adding a new civilization-era dataset file
description: Conventions for adding a whole new historical period (e.g. a dynasty or era) as its own dataset file within an existing region.
---

When a task asks for a new era file within a region that already has sibling files (e.g. `datasets/region/france/`):

- **Naming:** lowercase snake_case describing the era/dynasty (e.g. `capetian_france.json`), not a date-range filename. Match whatever naming pattern the region's existing files already use before inventing a new one.
- **Top-level `filename` field:** must equal the actual file's name, matching the `dataset-structure.md` schema requirement.
- **Chronological non-overlap:** check the immediately preceding and following sibling files' first/last event dates before drafting, and start strictly after the previous file's last event / end exactly where the next file (existing or planned) should pick up. Read the sibling file in full rather than assuming its end date from its title.
- **Event count:** ~30 events is a reasonable size for a ~150–350 year span with real thematic breadth (see `dataset-thematic-breadth.md`) — enough room for political, military, cultural, religious, and scientific angles without padding.
- **Avoid re-telling events already covered elsewhere:** tasks for these files typically flag specific cross-region duplicates (e.g. a battle already told from another country's side) — grep sibling region files for the same people/battles/councils before drafting, not just the explicitly flagged list, since flagged lists are not always exhaustive.
