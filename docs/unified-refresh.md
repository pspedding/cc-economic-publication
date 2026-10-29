# Unified refresh — implementation and test review

29 October 2026. **Implementation/testing only, not production activation.**

## Isolation and scope

This work is on local `feature/unified-refresh`, in a separate worktree based on
PR #1's reviewed `3cb5440`. PR #1, its branch, current main, source workbooks and
the existing monthly extraction job are unchanged. Nothing was pushed, merged,
scheduled or published. The generated files in this checkout are unchanged too.

`scripts/refresh_data.py` is the staging-only implementation, accessible through
the existing builder:

```sh
python scripts/build_data.py --refresh-config /path/to/refresh.local.json
python scripts/build_data.py --refresh-config /path/to/refresh.local.json --mode monthly
```

Both modes call the same workbook normalization, deterministic merger, approval
reconciliation, snapshot and writer code. No Git/GitHub write, scheduler API,
source workbook save, source extraction invocation or LLM/Azure call exists in
this path. The old explicit snapshot build remains for compatibility/regression
fixtures; it is not the source of the new core observations.

## Configuration and acquisition

Copy `config/refresh.example.json` to a private, ignored `*.local.json` file and
replace placeholder paths. Paths resolve relative to that config, not the shell's
working directory. The example pins the reviewed workbook revision and input hashes
and carries **only the owner-approved September CPI staging rule**. New source
revisions/baselines require an explicitly updated reviewed configuration, never an
unnoticed floating input.

- No obsolete `~/dropbox-sync` hard-coded fallback. The compatibility extractor
  requires `DASHBOARD_CORE_WORKBOOK` explicitly; use unified mode for the staging
  guarantees described here.
- `workbook.path` identifies a readable acquired snapshot, with logical Dropbox
  path, revision and SHA-256 in the manifest. A visible online-only File Provider
  entry is not sufficient. Acquisition failure does not select an old cache.
- Optionally pass a short-lived **HTTPS download URL through the environment**
  variable `DASHBOARD_WORKBOOK_URL`, obtained by the already authorised Dropbox
  connector. It overrides local acquisition; failure does **not** fall back to the
  local path. The URL is never written to a config, manifest, report or log. This
  implementation provisions no credentials and does not embed a Dropbox token.
- Download limit 20 MiB, timeout 30 seconds, exact expected byte hash required.
  The config's revision/hash must come from trusted acquisition metadata; the
  processor does not itself discover the latest Dropbox revision.
- Fresh download tested against current cloud revision `65ef581c01c810321afbe`:
  530,317 bytes, SHA-256
  `a9cffa4b97e1166ca88a142acb8bbdd4b41be4211f348e35dde4c1f3790698ad`.
  It matches the reviewed 29 October source and the Dropbox content hash recorded
  in the investigation. The source was not saved or hydrated by this implementation.

## Validation and preserved semantics

- Read the configured sheet/date column; require every **active** core indicator's
  column. Inactive old registry entries are not silently activated. CRB remains
  excluded. Preserve exactly the existing 59 active IDs and definitions.
- Strict valid calendar dates, finite numeric values, duplicate-column/month checks,
  no unlabelled numeric rows, no publication-date or row-position joins. Empty
  whitespace-only footer cells are not observations. Existing public dates must
  remain identical; date/schema/authority changes fail rather than drift.
- Read Excel's saved formula values. All 63 current formula caches match a bounded
  arithmetic dependency check. Unsupported formulas, missing/stale caches, errors
  and ambiguous dates fail for review; this is not a general Excel engine.
- Use the existing additional CSV/metadata and RBA F2.1 overlap guard; preserve
  source-specific nulls and latest-observation months. No forward fill, zero fill,
  interpolation or downloaded-number overwrite of a manual observation.
- Historical numeric revisions, old-to-null, missing-to-observed and new months
  are explicitly reported. Only exact approved old/new/month rules enter the
  staged candidate. Unapproved source values stay in the audit, not the candidate.
  A changed manual observation requires explicit approval, not freshness priority.
- Core observations come from the current workbook; the last approved bundle is
  only the comparison/definition/held-value baseline. It is not the core input.
- Additional inputs are hash-pinned. A changed file requires review of the new
  input manifest and any resulting observation/metadata differences. The existing
  upstream extraction/source adapters remain responsible for fetching observations;
  this implementation does not claim a newly activated additional-source collector.
- The inherited Explorer lead/lag same-month fallback and all UI functions remain
  unchanged. Redesign of that statistical convention is a separate enhancement.

## Monthly adapter — consumes existing artifacts, does not run the job

Private config may additionally provide `automatic` with:

```
staged / staged_sha256       existing staged_observations.csv
report / report_sha256      existing validation_report.json
run_record / run_record_sha256   existing successful run.json
mapping                     existing Excel column -> approved dashboard ID
max_lag_months              existing per-column lag policy
approved_providers          optional verified provider for an approved fill
approvals                   optional exact old=null/new/month fill rules
```

The adapter verifies artifact hashes, their binding in the successful run record,
source extraction status/counts and per-series publication lags. It compares all
available history, which includes the latest six-month revision window. Existing
extractors continue fetching on their own current schedule and with their existing
credentials. No scheduler hook or unattended cloud-authentication setup is installed.

Automatic proposals are **held by default**. Even an automatic rule cannot replace
a non-null manual value. An explicitly reviewed null fill also requires an approved
provider. A downloaded 10Y fill is never accepted through this adapter: it must
pass the separately verified RBA F2.1 authority/reconciliation path instead.

Testing used the existing successful 28 October artifact set without rerunning it.
There were **271 automatic proposals**, including early out-of-baseline months and
precision/authority/history differences. They are not 271 validated corrections.
All were held, together with the two vacancy values. These need a separate authority
and precision review before any automatic fill policy is broadened. The monthly
candidate remains identical to on-demand: the CPI change only.

## Immutable inputs, audit, idempotency and failure behavior

Every successful run captures content-addressed original workbook, approved
baseline, additional CSV/metadata and (monthly) extraction inputs. Snapshots use
exclusive creation, read-only file mode and hash verification on reuse. A modified
snapshot causes failure, not overwrite. The manifest records code hashes, source
revision/hashes, date policy, approvals and automatic provider/lag policy.

A deterministic content-derived run ID identifies an immutable run. A local OS
lock excludes overlaps. Entire candidates are built/validated in a temporary
directory and atomically renamed into `runs/<run-id>`; repeat runs compare all
files and reuse identical results. The configured output cannot be this checkout,
an input-containing directory or a configured protected production path. List all
other production/checkouts under `protected_paths` in the private config.

Each run contains `manifest.json`, `changes.json`, `REPORT.md`, output hashes and
the 60 generated dashboard files. Changes name IDs, old/new values, observation
months/dates, disposition, source revision/hash and sheet/cell or provider.
Run summaries explicitly say `publication: not_permitted`.

If Dropbox is unavailable, a source changes hash, formulas fail, authority conflicts
or artifacts are stale, exit nonzero with no new successful candidate and no fallback
or published-file modification. The previous successful candidate stays intact.
CLI error output is deliberately concise and URL-safe; no successful status is
returned for a failed acquisition. Stale accepted data are not relabelled fresh.

## Current candidate and vacancy investigation

Only approved staging change:

- `cpi_yoy`, 2026-09, `null -> 4.5`, `Interest Rate Decisions!D3`, date A3
  `2026-09-01`. Same indicator definition, unit and source label; latest observation
  month advances from August to September. October stays null. This verifies the
  user-designated spreadsheet/approved value, not a new independent ABS audit.

Held separately:

- `vacancy_rate`, 2026-08, `null -> 1.0`, H4.
- `vacancy_rate`, 2026-09, `null -> 1.0`, H3.

The workbook's **Data Sources** worksheet identifies **SQM Research Residential
Vacancy Rates**, frequency **Monthly**, and this regional publisher URL:

<https://sqmresearch.com.au/graph_vacancy.php?sfx=&region=nsw%3A%3ACentral+Coast&t=1>

This is a **Central Coast regional** reference, not a postcode-2250 or national
series. It supports the intended provenance, but does not independently establish
that its boundary exactly equals the dashboard's Central Coast LGA definition.
Both workbook cells are literal numbers, not carry-forward formulas. However,
literal values can still have been manually copied forward.

The publisher's graph returned **HTTP 403** via the available web/direct read
routes. No access-control bypass, paid subscription, national substitution or
postcode substitution was attempted. Separate monthly observations at 1.0%, their
exact regional boundary and freedom from manual carry-forward cannot therefore
be verified. **Both remain null in all candidate dashboard outputs**, with their
proposed source values retained in the private input/audit. Publisher-provided
regional export or independently accessible official monthly readings are required
before including them. Repetition alone is not proof either way.

## Acceptance results

- **26 Python tests pass**: eight existing integration tests plus 18 refresh tests.
  Covers acquisition/hash drift, month mapping, held revisions/nulls/new months,
  explicit auto fills/manual preservation, idempotency, unavailable Dropbox/no
  silent fallback, formula/column/date validation, protected paths, snapshot
  tampering, extraction/lag checks and overlap locking.
- **19 Node tests pass**, plus existing page regressions: 32 original chart datasets,
  1,296 legacy Pearson pairs and 24 lag checks unchanged against tracked data.
- Actual candidate acceptance passes: 59 IDs/individual JSON agreements, **58 full
  indicator objects unchanged**, only approved CPI differs, both vacancy months
  remain null, 32 default chart datasets plus three macro chart instances initialise.
- All **60 on-demand/monthly candidate files are byte-identical**. Repeat local and
  fresh cloud acquisition reuse the same run ID/output. No clock timestamp in final
  generated data; code/input/policy changes create a new immutable run.
- Original checkout/PR branch and the six protected production file hashes remain
  unchanged. No generated file or UI file in either checkout was edited.
- Tests use an offline DOM/Chart harness, **not a rendered-browser test**. The
  previously reported browser policy restriction was not bypassed. A separate
  candidate preview directory is supplied for manual acceptance, not served or
  published automatically. Run `python -m http.server 18765 --bind 127.0.0.1
  --directory /path/to/candidate-preview`, then open
  `http://127.0.0.1:18765/#macro-analysis`; stop with Ctrl-C. Check September CPI
  4.5, both held vacancy gaps, original charts and desktop/mobile layouts.

## Recommended PR structure and deployment plan — not executed

1. **PR #1:** retain untouched as the reviewed data/UI foundation. Merge only on
   explicit owner approval; main updates trigger Pages. This work does not assume
   approval to merge or deploy it.
2. **Implementation PR:** after permission to push/open it, submit this branch as
   a stacked diff against `feature/macro-analysis` (or retarget/rebase carefully
   after #1 lands). Only code, config example, tests and documentation; no private
   workbook/local config/generated data. Keep checkpoints and avoid duplicating
   the foundational changes in review. No push/PR created in this phase.
3. **Data-only PR:** separately generate the CPI-only data diff against the approved
   target base, with sanitized source hash/revision, change report and exact held
   exclusions. Include provenance and all generated files that actually differ;
   do not hand-edit them. Do not include the two vacancy values or automatic
   proposals. Require explicit merge approval. The candidate is staging, not this PR.
4. **Operational PR/config review:** only after on-demand acceptance, approve a
   caller that supplies current revision metadata and latest successful extraction
   artifacts. Keep the extractor running independently; use no second scheduler.
   Initially create private reports/candidates; GitHub write automation, source
   fetching/credential changes and any scheduler integration require separate
   approval. No automatic merge/website publication.
5. Before Stage 4B, resolve domain/serving mapping (repository Pages currently
   reports no custom CNAME), complete manual rendered acceptance, review current
   source hashes and confirm the exact merge-triggered deployment. After approved
   merge, verify served CPI/data hashes and functionality. Roll back by a reviewed
   revert PR of the actual integration/data commit; never reset main or overwrite
   the master workbook. Preserve baseline/reviewed Stage 2/3 recovery information.

Local execution with the existing Python environment, from this worktree:

```sh
../macro-data-pipeline/.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v
node --test tests/macro_analysis.test.js tests/macro_view.test.js
node tests/page_regression.js
node tests/refresh_acceptance.js /path/to/staged-run/data
```

The private acceptance package supplies run manifests, reports, test logs, candidate
files, code patch/recovery bundle and local invocation details. Private workbook
snapshots, live download URLs and credentials are excluded from the package/repo.

## Revision intake and separate approval controls

For each future refresh, an operator uses the existing authenticated Dropbox
connector to read metadata for the exact configured logical workbook path and
compares its revision to the last reviewed source manifest. This is an on-demand
check today: **no new polling task, scheduler integration or unattended publication
has been installed**. A changed revision triggers source intake, not publication.

1. Read revision, size, server/client modification times and available content-hash
   metadata. Acquire that exact revision into a separate local snapshot; verify
   size, Dropbox block content hash and SHA-256, then recheck remote metadata.
   If the revision changes during capture, discard the mixed acquisition and retry
   only as an explicitly bounded new intake. Never use an unrelated backup file.
2. Copy the private configuration to a new revision-specific local JSON file.
   Change only its workbook path/revision/hash, current approved-baseline path/hash
   and isolated staging root as appropriate. This is **configuration/data intake**,
   not a program-code edit or a credential/security change. The tracked example
   remains the historical 29 October example; do not overwrite it per release.
3. **Clear both manual and automatic approval lists for a new revision.** The
   source's new revision is not permission to reuse old value approvals. Initially
   run with empty approval lists: new observations, revisions and missing values
   appear as held proposals while the candidate retains the last approved values.
4. Verify schema, date basis, formula caches, geography and authority, then obtain
   approval of the exact desired old/new/month changes. Add only those rules to
   that revision-specific config and rerun. The run manifest binds the source hash,
   approved-baseline hash and exact approval rules; retain both pre-approval report
   and approved candidate as separate immutable runs.
5. Source approval and observation approval remain separate: approving the acquired
   workbook does not approve every cell change, and an approved value does not
   authorise a new source or provider. Automatic-source numeric history cannot
   overwrite non-null manual values; vacancy and authority conflicts stay held.
6. Review the sanitized report/diff and tests before a data-only PR is prepared.
   The tool has **no publication command**, auto-merge or scheduler hook. Explicit
   approval is required before pushing a new release branch/opening its PR where
   not already authorised, and again before merging a main-targeting PR because
   Pages publishes main automatically. Scheduled acquisition/authentication remains
   a later operational design/approval step, not an implied capability of the CLI.

Thus a legitimate new workbook revision needs no edit to Python/JavaScript code.
Hash mismatches intentionally fail until the new source intake is reviewed and
configured; they must not be bypassed by disabling verification. A missing Dropbox
source leaves the prior approved data untouched and never counts as a fresh success.
