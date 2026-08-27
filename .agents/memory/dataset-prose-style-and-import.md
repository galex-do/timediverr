---
name: Dataset prose style calibration and DB-import status
description: How to calibrate description tone against reference datasets, and why a written dataset JSON file is not automatically live in the app.
---

**Prose style:** when a user pushes back on a dataset's tone as too flowery/narrative, calibrate against `datasets/region/greece/BC2_ancient_greece.json` rather than more recent narrative-style files (e.g. the mesoamerica Teotihuacan file) — Greece's descriptions are tighter and more encyclopedic (~250-400 chars typical), still vivid, but factual rather than prose-heavy. Re-check average description length and phrasing against it before finalizing a new dataset when the user asks for "concise" or references Greece/Wales as the standard.

**DB import status:** writing a dataset JSON file under `datasets/` does NOT put it in the running app's Postgres database — `event_datasets` table is a separate store, and there is no discovered script/workflow that auto-scans the `datasets/` folder into it. Confirmed by checking the DB directly: e.g. `AD1_teotihuacan_city_state.json` was fully authored and committed but never appeared in `event_datasets`, while `BC1_olmec_culture.json` (same mesoamerica folder) was already imported. Import happens through an admin-only API (`POST /api/events/import`, `POST /api/datasets`) or an admin UI upload step, not automatically after file creation.

**How to apply:** when a user asks you to "build a dataset," the deliverable is the validated JSON file (correct schema, real 200-status Wikipedia sources, matching the calibrated tone) — do not assume it needs to appear on the live map to be "done," and do not try to hand-write SQL inserts to force it into `event_datasets` unless asked, since that would bypass the app's own import/validation path.
