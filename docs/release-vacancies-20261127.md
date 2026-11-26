# Approved vacancy/KPI release — 27 November 2026

The owner visually reviewed the private preview and explicitly requested
production publication at09:53Sydney. Baseline:`2584145eb48a2ed50946a4163c34c8f970c052fa`.

## Scope

Overview now has12 KPIs in the approved order:
Unemployment Rate; Job Vacancies; Jobseeker Recipients; Avg House Price;
Avg Unit Price; Avg Weekly Rent; Residential Vacancies; Total Retail Spend;
RBA Cash Rate; CPI Inflation — Headline (YoY); New Vehicles (Mo); STRA Revenue.

- New `residential_vacancies` reuses neither the `vacancy_rate` ID nor its unit.
  It contains55 monthly count observations, April2022–October2026; latest366.
  Counts use integer formatting and owner-supplied-model attribution. Upstream
  extraction was not independently verified; no authoritative URL is invented.
- `vacancy_rate` remains a percentage time-series chart in Housing & Construction,
  with55 observed months, latest0.96% inOctober2026.50 historical revisions plus
  one newly observed month are itemised in the normalized test fixture.
- Jobseeker and unit-price KPIs reuse existing published series and formatting.
- New counts are available in Explorer/metadata; no extra Housing chart added.
- All66 unrelated existing indicator objects remain unchanged, including retail,
  CPI monthly/quarterly history, EVs and their metadata.68activeIDs/69activeoutputs.
- Source columns matched by exact header/month, not positions after column insertion.
  All65 saved workbook formula caches validated. November missing values remain null.
- Existing analytical modules/math functions and responsive layout unchanged.
  Snapshot/cache key updated. No new lag, interpolation or causal behaviour.

## Rebuild and verification

```sh
python3 scripts/build_approved_vacancies.py --output-root /tmp/vacancy-release-data
node --test tests/*.test.js
python3 -m unittest discover -s tests -p 'test_*.py'
```

The fingerprinted normalized snapshot reproduces all69active outputs exactly.
Older approved builders/snapshots remain historical release artifacts, not the
current publication entry point. Do not run an older builder over this release.

Tests retain historical invariants except explicitly approved vacancy changes,
with exact current-source observations/count/rate separation tested independently.
DOM/chart harness tests do not claim rendered-browser validation; visual review
was performed by the owner. No private workbooks, local source paths, credentials,
preview configuration/banner or scheduler changes are published.

## Recovery

Normal revert of this release merge (mainline1), preserving subsequent changes,
then normalPRmerge and Pages/live asset verification. Never force-push.
