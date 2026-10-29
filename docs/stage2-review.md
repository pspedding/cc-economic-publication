# Stage 2 — Dashboard Data Integration review

**Complete for review, not deployed. Stage 3 has not started.**

Branch: `feature/macro-analysis`, based on `main` commit `8b42cb4`.
This is a local feature branch; nothing was pushed, merged, or published.
No production master, credential, scheduler or live website was changed.

## Data quality gate completed

See [source evidence](macro-data-quality.md) and
[original/corrected audit](macro-corrections-audit.csv).

- Four ANZ headline corrections use the official **monthly historical table**:
  March 2024 82.2 → 82.0; June 2024 79.9 → 79.5; April 2025 85.0 → 83.4;
  September 2026 70.5 → 74.6. All 54 resulting headlines match the authority.
- Supplied values correspond to weekly results or four-week averages; exact
  import history is unknown. Those weekly reports explain the likely aggregation
  mix-up but were not used to construct replacement monthly observations.
- 22 audited changes include the 4 headlines, 7 MoM changes, 7 YoY changes and
  4 ANZ-minus-Westpac arithmetic differences. Original workbook values and initial
  missing-value windows are retained in the separate historical review workbook.
- Westpac is now verified, not merely inferred from a single release: RBA H3,
  `GICWMICS`, monthly SA index, matches **54/54** supplied observations. It may
  therefore be included. Derived survey differences are clearly labelled as
  arithmetic differences, not calibrated common-scale sentiment gaps.

## Counts — bundle versus individual files

| Measure | Before | Feature-branch test output |
|---|---:|---:|
| Active bundle indicators | 37 | **59** |
| Retained legacy bundle IDs | 37 | **36**, CRB explicitly excluded |
| Newly added IDs | 0 | **23** |
| Additional dataset indicator fields | — | 24, including the reused 10Y ID |
| Standalone indicator JSON files | 41 | 63 |

Four standalone JSON files were already orphaned from the original bundle
(`airbnb_revpal`, `airbnb_occupancy`, `vehicles_evs`, `interested_buyers`). They
remain byte-for-byte unchanged and inactive; they are not counted as newly added.
Unverified `crb_index` is omitted from the bundle and its generated indicator JSON
is removed on this branch. Its registry definition/source history are preserved.
No other existing ID, metadata field, series date or observation is altered.
Legacy objects receive additive geography, basis and latest-month metadata.

## Implementation and changed files

- `scripts/build_data.py`: optional explicit monthly integration CLI; existing
  workbook mode/registry retained. Both modes exclude the known-unverified CRB.
- `scripts/macro_data.py`: strict month/numeric/schema validation; verified-source
  and dependency gating; deterministic bundle/JSON generation; no downloads,
  private workbook writes, scheduler calls or deployment operations.
- `data/sources/legacy_dashboard.json`: snapshot of the existing **public** bundle,
  ensuring optional fields/IDs are not lost by regenerating from a different
  private workbook variant. It is a reproducible Stage 2 baseline, not a replacement
  for future approved production ingestion.
- `data/sources/macro_additional.csv`, `macro_metadata.json`: reconciled public
  additional data, exact source IDs, units, geography, basis and eligibility.
- `data/data.js`, `data/indicators/*.json`: generated branch-only test versions.
- `index.html`: only data-driven additions to existing macro selectors and metadata
  table; unverified CRB metadata is hidden. No CSS/layout, chart implementation,
  Chart.js version, section lists, export function or correlation/lag formula changes.
- `tests/test_macro_data.py`, `tests/page_regression.js`: offline regressions.
- `.gitignore`, quality/audit/review documents. No new runtime dependencies.

The existing `bond_yield_10yr` ID is the only authoritative 10Y dashboard series.
All 54 existing values reconcile by `YYYY-MM` before generation. Its legacy dates
and metadata are preserved for compatibility, with explicit additive metadata
that these are monthly-average observations, not cash-rate decision-day yields.
New maturities and other new series use `YYYY-MM-01` dates as monthly display keys.
Original cash-rate effective dates remain unchanged. No row-position joins,
forward fills, interpolation or missing-to-zero conversions are introduced.

## Reproduce the test data and regressions

Use the existing Mac mini Python/openpyxl environment; from the repository:

```sh
../macro-data-pipeline/.venv/bin/python scripts/build_data.py \
  --baseline-snapshot data/sources/legacy_dashboard.json \
  --additional data/sources/macro_additional.csv \
  --additional-metadata data/sources/macro_metadata.json
../macro-data-pipeline/.venv/bin/python -m unittest discover -s tests -v
node tests/page_regression.js
```

`--output-root <directory>` can generate separate local test files instead of
the branch's `data/`. All input validation/merging finishes before output writes.
The new mode does not read Dropbox credentials or private workbooks. The original
no-argument legacy workbook path is intentionally not repointed or scheduled.

## Results

- **8/8 Stage 2 Python tests passed**: every original field/value/date retained
  for 36 legacy IDs; source gating including dependent indicators; corrected
  ANZ and verified Westpac; exact yields/spread; canonical monthly keys; source-
  specific missing values; duplicate/nonfinite rejection; fail-closed 10Y
  reconciliation; deterministic regeneration; bundle/JSON agreement; unchanged
  original indicator registry.
- **10/10 retained Stage 1 tests passed** again. Production SHA-256 guards pass.
- Offline execution of the actual old/new page JavaScript with DOM/Chart stubs:
  **32 default line-chart datasets unchanged**, **1,296 legacy Pearson pairs
  unchanged**, **24 legacy lag checks unchanged**; four new Explorer selections
  successfully construct the expected two datasets; **31 macro options**; exports
  and chart/correlation function bodies unchanged.
- RBA 10Y remains **54/54** reconciled; 5Y September is 4.958%, spread 36.1 bp.
- Repeated builder generation produces identical data files. No service restarts
  or security/credential changes were needed. Source/definition uncertainty
  cannot be bypassed just by setting publication_eligible=true: validation status
  and verified dependencies are also required.

## Unresolved issues and boundaries

1. **Real-browser rendering is unverified.** OpenClaw blocked navigation to the
   temporary loopback preview by policy. That policy was not changed or bypassed.
   The preview process was stopped. DOM/Chart-stub checks do not prove browser,
   canvas, CDN, mobile rendering, print rendering or user-interaction fidelity.
2. CRB identity remains unresolved and is excluded. Source history is retained
   solely for traceability; no RBA substitute is silently relabelled as CRB.
3. Existing lag code has a same-month fallback when a shifted observation is
   unavailable. It is deliberately unchanged to preserve behaviour, not endorsed
   as a new methodology. Review separately before expanding lead/lag claims.
4. Correlation rankings can change because verified new series join the candidate
   set; all existing pairwise results remain identical. The primary Explorer
   selector remains regional-only, as before. Macro-primary selection and new
   specialised charts belong to Stage 3, not this data-integration stage.
5. Existing DOCX export is a placeholder; it remains unchanged. No deployment
   configuration or GitHub Pages trigger was exercised or modified.
6. NSW August release lag and missing September observations remain explicit.
   Future source fetching, revision acceptance and scheduling await later-stage
   approval; this stage consumes pinned validated snapshots only.

**Stop here for approval.** No Stage 3 charts/design work, push, PR, merge, Pages
publication or production scheduler integration has been performed.
