# Grouped Indicator Definitions & Metadata — draft PR #5

Branch `feature/dynamic-indicator-metadata`, based on deployed main `8466fb72d42401b6e38c60c842a4e6be28c2382d`. Original reviewed commits e38463b/ba707b5 and updated checkpoint 8cc27ee remain in history. This refinement is authorised for implementation and preview only, not merge/deployment.

## Directory and preserved fields

Exactly 59 active published slugs, each represented once, grouped into eight native expandable subjects:

1. Economy & Labour
2. Housing & Construction
3. Transport
4. Tourism
5. Consumer & Business Confidence
6. Interest Rates & Monetary Policy
7. Markets & Commodities
8. NSW Household Spending & Retail

The prior flat-table checkout did not yet contain grouped subjects; this revision implements the requested eight-category directory. Group labels/membership are display-only, derived from existing section/slug families, not added to published data or presented as new source provenance. Unknown section families remain visible in Markets & Commodities rather than silently dropping an active slug.

Each category contains a compact list with **Indicator, Source, Latest Period and Latest Value**. Each indicator expands to a definition list containing **Indicator, Identifier, Content Area, Definition, Measurement basis, Source, Frequency, Scope, Units, Latest Period, Latest Value, Source observation date and Source link/series ID**. Content Area uses an existing contentArea field when available, otherwise the existing published section's display name; Scope uses published geography. Missing fields remain explicitly not documented. Quarterly frequency is preserved.

No legacy surplus inventory or unpublished indicator is activated. Source wording is reproduced verbatim, including separately identified CPI/FRED wording limitations. Safe HTTPS source links are rendered as DOM text/elements with noopener/noreferrer, not interpolated HTML. Source links are included only where already published. All 58 Phase C provenance proposals remain unapplied.

## Paired latest observation and formatting

The pure metadata module scans the published series, validates dates and rejects duplicate calendar months, then selects the greatest calendar month with a finite numeric, non-null observation. It does not use array position, current date or release date. Both latest fields and the retained source date come from that exact observation. A valid zero is retained; null, undefined, strings, booleans and non-finite values are not numbers. No input is changed, filled or relabelled as a later month. A series ending in null October can correctly show its actual September observation, not an invented October value. All-missing or ambiguous/invalid series display Not available for both fields.

The derived month is compared with latestObservationMonth. A conflict retains the truthful derived pair with an explicit warning in both the summary and full metadata; it is not silently changed to the stored month. Missing stored metadata is noted. All 59 current indicators have matching stored/derived latest months; tests fail if this drifts.

Rendering calls the existing dashboard **formatVal(value, format)** helper, then displays the published unit where needed. It does not duplicate numerical formatting rules or rescale observations independently. Existing currency abbreviations, percentage conventions, count separators and decimal precision are preserved. Units make AUD, USD, index points, basis points and scaled units explicit; an existing % suffix is not repeated. Unknown units remain honestly not documented. No formatter is called for missing observations.

Example: CPI latest period **2026-09**, value **4.30%**. Vacancy remains its actual latest observed month **2026-07**, not either held August/September proposal. No provenance correction is bundled with these display values.

## Search, responsive behaviour and accessibility

Search covers all fields (including hidden full metadata and latest values), opens matching categories and hides unmatched entries/empty categories. The live count reports matches out of 59. Clearing search restores previous category expansion state. Re-rendering replaces entries without duplication and preserves category/search state.

Native details/summary supplies keyboard Enter/Space expansion and screen-reader expanded state for both levels. Summary cells have accessible field labels, shown visibly in a two-column mobile layout. Full metadata uses native dt/dd semantics. The popup has a labelled modal dialog, labelled search and close controls, polite count announcements and visible focus styles. Opening focuses search; Escape closes/returns focus to the opener; Tab/Shift-Tab stay within visible enabled controls. No hidden unexpanded links are included in the focus cycle. The existing chart selections, correlation calculations and inherited lag fallback remain unchanged.

Desktop summaries use four columns. At 600 px and below they become two-column labelled cards; full metadata becomes a single-column list. No header, chart styling, framework or backend changes.

## Validation

```sh
node --test tests/*.test.js
python -m unittest discover -s tests -p 'test_*.py'
node tests/metadata_regression.js
node tests/page_regression.js
node tests/scatter_regression.js
```

**65 Node tests** (43 existing + 22 metadata-specific) and **26 Python tests** pass. Coverage includes all 59 slugs/eight categories, date ordering, exact paired month/value, zeros/non-finite/nulls, duplicate/invalid dates, stored-month mismatches, all existing value formats, source-link safety, full preserved fields, search/reset/re-render, native semantics/focus/Escape/Tab and desktop/mobile layout contracts. Offline DOM/CSS contracts are not rendered-browser or assistive-technology acceptance.

The additive regression is pinned to current main 8466fb7, comparing all 37 initial chart configurations, 32 default charts, 3,481 Pearson pairs, analytical function source, seven-month lag and scatter options. Every tracked data/builder/macro/scatter file is byte-identical to deployed main; all 59 objects/60 active outputs unchanged. The independent CPI release-aware audit also passes.

Unchanged historical fixtures remain explicit: page_regression expects pre-CPI null and fails at dataset 22; scatter_regression expects data byte-equal to the old 4.5 release. Neither is relaxed/disabled. Historical refresh_acceptance targets null→4.5, not this UI-only update. The new exact-main comparison supplements rather than weakens these protections.

## Preview and manual acceptance

Existing loopback preview: **http://127.0.0.1:18767/** on the Mac mini. Open ℹ. Worktree: `/Users/openclaw-spedding/.openclaw/workspace/projects/cc-economic-metadata`.

Restart if needed, from that worktree:

```sh
python3 -m http.server 18767 --bind 127.0.0.1 --directory .
```

The managed browser still returns **browser navigation blocked by policy** for localhost. No alternate route, tunnel or deployment is used. Served HTML/data/module/CSS bytes are checked against this branch. Actual browser and screen-reader acceptance remains with the owner; no screenshots are represented as evidence for this refinement.

Check desktop 1440 and mobile 390/360 widths:

1. Eight category expanders; their counts total 59. Open each; compact summaries contain the four requested fields. Expand an indicator to see all preserved metadata, definition and source link. No duplicate or surplus slug.
2. CPI shows September 2026 / 4.30%; vacancy shows July, with August/September still gaps in charts. Inspect currencies, counts, index points, basis points and quarterly indicators. No October carry-forward.
3. Search cpi_yoy (one), quarterly (three), a source, a category and 4.30%. Check no-match count, reset and restored category states.
4. Tab to native summaries, Enter/Space to expand; verify focus visibility and logical reading order. Escape closes and restores opener focus; Tab/Shift-Tab do not escape the popup. Check screen-reader names/expanded states/count announcements.
5. At mobile widths the compact list wraps into labelled two-column cards, details remain readable, search/close stay usable. The inherited site-header overflow remains outside scope.
6. Close and exercise chart/scatter selections, date controls and lag. No analytical state changes from directory/search/expansion.

## Separation and recovery

Draft PR #5 remains unmerged and auto-merge off pending owner approval. The September CPI correction is inherited from main (PR #6), as are PR #7's two test expectations; neither is an additional change in this PR. Source workbooks, generated observations, source authorities, extraction pipeline, scheduler, domain and backend unchanged. No new economic indicators or monthly dashboard automation.

Original reviewed commits, current-main baseline and updated feature bundle preserve recovery. If later approved, use a normal merge and a normal revert for rollback rather than rewriting history. Keep all 58 provenance proposals as a separate approval/release.
