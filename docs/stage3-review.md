# Stage 3 — Macroeconomic visualisations review

29 October 2026. Local branch: `feature/macro-analysis`. **Not deployed.**

## Baseline and recovery

- Stage 2 checkpoint: `e86e2a54b307e4744a5d4874151ea2cb18f454f9`.
- Annotated local tag: `checkpoint/stage2-reviewed-e86e2a5`.
- A verified Git recovery bundle is supplied in the separate Stage 3 review
  package. The checkpoint remains an ancestor of this work; no history rewrite.
- Indicator-count reconciliation: 37 previous active indicators + 23 newly
  integrated indicators − 1 excluded, unverified CRB indicator = **59 active**.
  The existing authoritative 10Y yield is reused, not duplicated. Stage 3 adds
  no indicators and changes no source or generated data files.

## Implementation

1. **Yield curve:** independently selected historical months, four supplied
   2/3/5/10Y points, numeric maturity axis, monthly-average yield units, precise
   tooltips, calculated 10Y–2Y basis-point spread, and textual values/availability.
   Straight segments connect supplied maturities only. The RBA's own underlying
   constant-maturity interpolation is disclosed; no extra observations are added.
2. **Historical spread:** shared month range, all-history control, zero reference,
   red negative-spread shading/points and textual observed inversion periods.
   An inversion is strictly a negative spread. Missing months break periods and
   remain gaps, not zeros or non-inversions.
3. **Monetary-policy comparison:** cash target, 2Y/10Y yields and headline CPI
   annual change. Checkboxes and chart legend remain synchronised. Monthly joins
   retain original effective dates in cash-rate tooltips. Cash snapshots are not
   represented as monthly averages or a verified decision calendar; CPI annual
   change is not an interest rate. No observation is shifted by publication date.
4. **Explorer:** macroeconomic indicators are also available as primary indicators
   and correlation anchors, retaining regional choices, defaults and navigation.
   Existing correlation and lag functions are byte-identical to Stage 2.
   In particular, missing shifted observations can still fall back to the same
   unshifted month. This inherited behaviour is disclosed, not silently fixed or
   endorsed as a new statistical methodology.
5. Existing Chart.js **4.4.3**, static architecture, styles and navigation are
   reused. Three isolated chart instances do not replace the original charts.
   Scoped CSS provides desktop/touch/mobile layouts; labels and textual summaries
   supplement canvases. No framework, service, scheduler or Azure dependency.

## Commits and changed files

- `f0448a1` — pure calendar-month/yield/spread calculations and 11 unit tests:
  `scripts/macro-analysis.js`, `tests/macro_analysis.test.js`.
- `1ba8526` — panels, controls, Explorer choices and regression/interaction tests:
  `index.html`, `scripts/macro-analysis.css`, `scripts/macro-view.js`,
  `tests/macro_view.test.js`, `tests/page_harness.js`, `tests/page_regression.js`.
- This review document is committed separately. The supplied `commits.txt` lists
  the complete final commit IDs, including the documentation commit.

## Automated results

Run from the repository root:

```sh
node --test tests/macro_analysis.test.js tests/macro_view.test.js
node tests/page_regression.js
../macro-data-pipeline/.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v
git diff --exit-code e86e2a5 -- data/
git diff --check
```

- **19/19 Node tests pass:** historical month independence/same-month selection;
  all 54 verified spread observations; null gaps; negative/zero yields; inversion
  boundaries; calendar alignment/effective dates; chart controls; macro/macro and
  regional/macro selections; checkbox/legend state; responsive configuration.
- **8/8 Python integration tests pass:** legacy IDs/metadata/values, schemas,
  verified source values, missing dates, publication exclusions/dependencies,
  invalid inputs/authority conflicts, repeatable temporary generation and registry.
- **32 original default line-chart datasets unchanged** against both original
  main and Stage 2; **1,296 legacy Pearson pairs unchanged**; **24 legacy lag
  checks unchanged**. Core chart, correlation, lag and export functions unchanged.
- No source/generated data difference from `e86e2a5`; no protected production
  file hash difference (six protected files). Main remains `8b42cb4`.
- The UI harness executes the actual page functions against a DOM/Chart stub.
  Its 1280/768/360-width checks validate configuration/CSS contracts, **not actual
  browser layout or pixels**. Logs and initial chart summaries accompany review.

## Browser status and evidence limitations

Actual browser navigation to `http://127.0.0.1:18765/#macro-analysis` returned
**“browser navigation blocked by policy”** on the Stage 3 attempt. The restriction
was not bypassed or changed. The temporary preview process was stopped.

Consequently there are **no rendered screenshots**, and canvas appearance,
hover/touch fidelity, CDN loading, scrolling, print rendering and desktop/mobile
overflow remain unverified. Automated chart/summary JSON is functional evidence,
not a visual screenshot substitute. Manual browser acceptance below remains
required before deployment. No deployment is authorised by this Stage 3 review.

## Local preview and manual acceptance

```sh
cd /Users/openclaw-spedding/.openclaw/workspace/projects/cc-economic-publication
../macro-data-pipeline/.venv/bin/python -m http.server 18765 --bind 127.0.0.1
```

Open **http://127.0.0.1:18765/#macro-analysis** in your own browser. Stop the
foreground server with Ctrl-C when finished. The preview is not currently running.
Existing CDN dependencies require internet access; no data build is necessary.

1. At 1280px, 768px and 360px viewport widths, check navigation, readable controls,
   no horizontal overflow, wrapping source notes and resized canvases. Confirm
   original sections/Explorer remain usable and touch controls can be selected.
2. Set Month A to September 2026: 2Y **4.922%**, 3Y **4.910%**, 5Y **4.958%**,
   10Y **5.283%**, spread **36.1 bp**. Hover each supplied maturity. Set Month B
   independently to April 2022: spread **86.0 bp**. Selecting the same month
   twice is valid; the two series should coincide.
3. Select April–June 2022 for the shared history: both historical panels use
   three months. Set the start after the end: an error should retain the last
   valid charts. Click All history: April 2022–October 2026.
4. Inspect October 2026: cash target **4.6%**, with unavailable yields/CPI left
   as gaps. Check the cash effective-date and measurement-convention tooltips.
   Toggle each policy series using both its checkbox and chart legend.
5. Verify the spread zero reference and inversion explanation. Negative and
   missing scenarios are covered with isolated test fixtures, not injected into
   the preview's verified data. Do not edit generated files to manufacture them.
6. In Explorer, compare 2Y versus 10Y, then ANZ versus Westpac; inspect r/lag
   changes and the visible fallback explanation. Switch back to a regional
   primary indicator and exercise correlation-table Plot links and reset.
7. Exercise existing charts, date controls, correlation rankings and exports;
   inspect the browser console for errors. DOCX remains the existing placeholder.

## Unresolved issues and deployment boundaries

- Real-browser/manual acceptance remains outstanding because of browser policy.
- CRB remains excluded: its source/definition is unresolved. No uncertain data
  was substituted. Existing source lags/missing observations remain visible.
- Cash target dates come from the existing master, not an independently verified
  decision history. New panels distinguish these conventions without changing it.
- Existing same-month lag fallback and DOCX placeholder remain intentionally
  unchanged. New correlation anchors may change rankings, not existing pairwise
  calculations. Correlation/inversion text makes no causal or forecasting claim.
- Stage 3 consumes validated pinned data. No source refresh, production workbook
  edit, scheduled update, credential/security change, merge, push or deployment
  occurred. Production activation and GitHub Pages publication require later
  explicit approval after review and acceptance.
