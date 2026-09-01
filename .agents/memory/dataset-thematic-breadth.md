---
name: Dataset thematic breadth quality bar
description: What "good" looks like for a civilization/region history dataset in this map app, and the failure mode to avoid.
---

Good reference datasets: `datasets/region/britain/BC1_wales.json` and `datasets/region/greece/BC2_ancient_greece.json`. Both mix many angles — religion/myth, literature/poetry, law codes, engineering, science, daily life, art, military, decline — not just political/military chronology.

**Failure mode to avoid:** for a civilization mostly known through a *neighbor's* records (e.g. Dilmun via Mesopotamian tablets), it's easy to generate many events that are all really the same fact restated — "X was mentioned in a Mesopotamian record," "Y sent tribute," "Z king's title claims Dilmun" — which reads as repetitive even if each is individually true and sourced.

**Why:** a user explicitly rejected a 20-event Dilmun dataset for being dominated by "trade, mesopotamian mentions" and asked instead about boats, gods, and how water shaped culture — i.e. wanted the civilization's own internal life, not just its footprint in someone else's archive.

**How to apply:** before finalizing a dataset, group drafted events by underlying fact-pattern (not just `type`/`tags`) and cut down clusters of near-duplicate "X appears in a foreign record" events to one or two of the strongest. Deliberately research and include: technology/craft objects, the civilization's own gods/myths (not just how outsiders described them), daily-life/human-interest anchors, and how geography (water, terrain) shows up in culture — not only trade and political subjugation. All facts still must trace to a real Wikipedia source per dataset-structure.md.

**Architecture/craft gap-filling needs live fact-checking, not recall.** When a user asks for a specific missing angle (e.g. "add architecture like windcatchers"), fetch the actual Wikipedia page before drafting instead of relying on remembered dates or attributions — several plausible-sounding claims turn out to have disputed/undated origins (e.g. the windcatcher's origin is disputed among Egypt/Iran/UAE with no firm ancient date) or subtly different facts than memory suggests (e.g. Taq Kasra is the *second*-largest unreinforced-brick vault, not the largest; its date is itself debated between two rulers a century apart). When the general claim is undated or disputed, anchor the event to a specific, well-documented instance instead (e.g. skip "Persia invented the windcatcher" but write the well-dated Yakhchal ice-house, which integrates a windcatcher/badgir and has a solid ~400 BC source).
