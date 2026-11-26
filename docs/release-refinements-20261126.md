# Approved RegionalData refinements — 26 November 2026

Owner visually reviewed the private preview and explicitly approved production at
22:43 Sydney. Baseline: `08b30ce4d5c2032edcae9b146201e4f498ac088a`.

## Approved changes

- `cash_rate` name becomes **RBA Cash Rate**, including chart, selector, scorecard
  and policy labels. Its source mapping and numerical observations are unchanged.
- Preserve headline ID `cpi_yoy`, named **CPI Inflation — Headline (YoY)**.
- Add `cpi_trimmed_mean_yoy`, named **CPI Inflation — Trimmed Mean (YoY)**,
  immediately fifth after headline in the global control and both Explorer lists.
  Existing unemployment initial/reset primary is preserved.
- ABS Table6 A130400382R supplies19 monthly annual rates, April2025–October2026,
  seasonally adjusted, percentage format. All19 match the owner workbook.
  Source vintage25November2026; April/August2026 revisions versus September
  vintage explicitly reconciled. No headline observations changed.
-10 historical quarterly annual rates (December2022–March2025) are separately
  labelled/dotted in time-series charts. Repeated quarterly workbook values are
  not treated as monthly data. Quarterly display history never enters monthly
  correlation, scatter or lag calculations. No duplicate CPI ID.
- Activate reserved `vehicles_evs` as fourth Transport chart:52 observed monthly
  new battery-EV registrations, July2022–October2026, latest426. PHEVs excluded.
  Registration definition/filter is owner-confirmed; original upstream extraction
  was not independently verified. Metadata retains that provenance distinction.
- All65 previously published numerical series remain unchanged. Candidate has67
  active indicators. No missing values filled; no new causal model or lag rules.
- Bump data and changed-module cache versions. Quarterly-history tooltip explicitly
  retains its own indicator label/frequency and units.

## Rebuild and tests

```sh
python3 scripts/build_approved_refinements.py --output-root /tmp/refinements-data
node --test tests/*.test.js
python3 -m unittest discover -s tests -p 'test_*.py'
```

The new immutable fingerprinted public snapshot reconstructs all68 active outputs.
The earlier refresh snapshot/builder is retained for its historical release, not
for overwriting this one. Tests assert current release contracts and retain
historical source/feature contracts except explicitly approved registry/label
changes. DOM/chart harness checks are not a rendered-browser claim; visual
acceptance was performed by the owner on the private preview.

No private workbooks, source access settings, credentials, preview banner,
loopback-only configuration or private staging paths are published.

## Recovery

Normal Git revert of this release merge (mainline1), preserving subsequent work,
then normal PR merge and Pages/live asset verification. Never force-push.
