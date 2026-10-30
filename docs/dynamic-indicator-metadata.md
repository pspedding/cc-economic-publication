# Dynamic Indicator Definitions & Metadata — local review

Branch `feature/dynamic-indicator-metadata`, updated against PR #7 main `8466fb72d42401b6e38c60c842a4e6be28c2382d`. The reviewed commits `e38463b` and `ba707b5` are retained through a normal merge of main; the reviewed popup HTML, JavaScript, CSS and harness are unchanged. The September CPI correction from PR #6 and the two expected-value assertions from PR #7 are inherited from main, not additional data or test changes in this PR.

## UI-only scope

The old 50-row `INDICATOR_META` worksheet inventory (49 displayed after CRB removal) and appended 23-row list are replaced by one row per entry in `CC_ECONOMIC_DATA`. This produces exactly 59 active rows instead of 72. Thirteen unpublished worksheet fields no longer appear; no underlying history or standalone JSON file is deleted or activated.

Seven columns: indicator name (with slug), definition and measurement basis, source/reference/series ID, geography, frequency, units and latest observation month. Quarterly labels remain intact. Existing case-insensitive popup search now covers every displayed field, with a matching-row count. Re-render replaces rows instead of appending duplicates. Popup opening/closing, chart selections and navigation remain separate.

`scripts/indicator-metadata.js` is pure row preparation, safe-source-link normalization and latest-month checking. `scripts/indicator-metadata-view.js` uses DOM text nodes/textContent and HTTPS-only links without userinfo, opening with `noopener noreferrer`. No interpolated metadata HTML or fabricated source URL is introduced. Styling is scoped to the existing modal/table; seven columns scroll within the popup at narrow widths. No site-header changes.

The UI reproduces **existing published metadata verbatim**, including separately identified CPI/FRED source-wording limitations. It does not silently apply the separately reviewed source-correction proposals. A source name without a published URL remains visible with a provenance-detail notice; missing fields use explicit not-documented states, not invented information. Presence of a URL is not displayed as a new validation certification.

Latest month uses the published field when it agrees with the latest finite observation. Zero is valid; trailing null/nonfinite values do not advance it. Missing latest metadata can be computed from observations with an explicit note. Invalid dates, duplicate months or conflicts produce an unavailable/unverified state without removing the indicator's row. No download date/current date or another series' month is substituted.

All data, metadata objects, definitions, series dates, numeric observations, nulls, source authority and generated outputs remain unchanged. No data-builder, extraction, scheduler, domain or backend change.

## Validation

```sh
node --test tests/*.test.js
python -m unittest discover -s tests -p 'test_*.py'
node tests/scatter_regression.js
node tests/metadata_regression.js
node tests/page_regression.js
```

57 Node tests (43 existing + 14 metadata-specific) and 26 Python tests pass. New coverage includes exact active slug correspondence, absence of surplus/orphan rows, idempotence, missing/hostile fields, HTTPS/userinfo rejection, safe DOM text insertion, latest-month/zero/null/invalid/duplicate handling, search and empty matches, quarterly frequency, popup open/close independence and responsive CSS contracts.

The additive metadata regression is pinned to 8466fb7 and compares every initial chart configuration (including scatter), all 3,481 Pearson pairs, legacy function source, selected CPI/cash-rate seven-month lag and scatter option state. All data/builder/chart-script bytes remain equal to this corrected deployed baseline. The old scatter regression remains pinned to the earlier 4.5 release and fails its frozen byte-equality assertion after the separately approved 4.3 correction; it is not weakened or disabled. A separate release-aware audit preserves the exact authorised CPI delta and unaffected behaviour.

The original pre-CPI `tests/page_regression.js` remains unchanged and still fails at dataset 22 because it expects September CPI to be null. The corrected deployed observation is 4.3. This is the documented inherited failure, not a new metadata regression; it is not weakened or disabled. The historical `refresh_acceptance.js` fixture likewise targets the earlier null→4.5 release, not a new candidate from this UI-only branch.

## Preview and manual acceptance

The temporary, loopback-only preview serves this feature worktree at **http://127.0.0.1:18767/**. Open the ℹ popup. Recreate it if needed from this directory:

```sh
python3 -m http.server 18767 --bind 127.0.0.1 --directory .
```

The managed browser returned **"browser navigation blocked by policy"** for this local preview. No alternate route, public tunnel or deployment was attempted. HTTP checks verify the served HTML, data and metadata scripts/CSS; offline tests are not proof of rendered desktop/mobile appearance. Screenshots and actual local browser acceptance remain outstanding.

Manual checks at desktop 1440 and mobile 390/360 widths:

1. Open ℹ; confirm 59 rows, seven requested columns, readable definitions/units and a source notice where no link exists. All 13 surplus entries and CRB should be absent.
2. Search `quarterly` (three rows), `cpi_yoy` (one row), `basis points`, source names, geography and latest months. Check no-match count and clearing search restores 59. Re-open and re-render without duplicates.
3. Open an existing RBA/ABS source reference; confirm correct HTTPS page and separate tab, no fabricated FRED/CPI links. Links are only those already published.
4. Confirm CPI latest month remains September and vacancy July; no October value or missing value becomes zero. CPI charts and tooltips show the separately approved and deployed September 4.3 correction. The popup changes no observation.
5. On mobile, horizontally scroll inside the table to the final column; verify modal close/search remain usable. The known inherited site-header overflow is outside this feature.
6. Close popup and exercise Data Explorer/scatter selections, options, date ranges and lag; confirm no state or chart regression.

## Separation and recovery

Phase A September CPI 4.5→4.3 was separately approved and deployed through PR #6; this branch inherits it from main. All 58 Phase C source-metadata field proposals remain in a **private external review package**, unapplied and excluded from this PR. They require separate approval and candidates. No private workbook/snapshot/configuration is committed.

This branch is draft PR #5. Updating the feature branch does not merge or deploy it. Recovery preserves the original reviewed commits/bundle and updated main baseline 8466fb7. Review and approve the updated popup and browser checks before merge. Keep provenance corrections separate; never bundle numerical corrections into this popup release.
