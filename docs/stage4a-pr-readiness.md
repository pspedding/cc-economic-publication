# Stage 4A — Pull-request preparation

29 October 2026. Preparation/push/PR only; **no merge or deployment approval**.
Earlier stage review documents describe the state at their respective checkpoints.

## Pre-push verification

- Full repository checked out on `feature/macro-analysis`.
- All 19 Node calculation/interaction tests and eight Python integration tests
  passed. Existing page regression checks passed: 32 original default line-chart
  datasets, 1,296 Pearson pairs, 24 lag checks and existing core functions unchanged.
- The explicit source-snapshot workflow was executed with `--output-root` pointing
  to a temporary directory. Its 60 files (bundle plus 59 active indicator JSON
  files) match the tracked outputs byte-for-byte. Four inactive legacy indicator
  files remain unchanged. No generated data was edited or refreshed for this step.
- No data difference from Stage 2; six protected production input/configuration
  hashes still match. No scheduler, credential, production master or destination
  modification. No new workflow or scheduled service.
- Reviewed the full diff against main: source/audit inputs, deterministic builder,
  intentional generated outputs, UI/calculations, tests and stage documentation.
  Legacy numbers and metadata are tested for preservation; standalone JSON files
  are regenerated from the authoritative legacy bundle rather than manually edited.
- No credential patterns detected in additions across feature commits; no private
  XLSX workbooks, tokens, `.env` files, recovery bundles or local execution logs
  are included. The source snapshot is the previous public dashboard bundle.
  The preview instructions now use a portable checkout path.
- The final branch must be clean, checked against unchanged remote main and pushed
  without force or automatic tag publication. PR creation must target main, with
  auto-merge disabled and no deployment requested.

## Checkpoints and recovery

- Original production/main baseline: `8b42cb472e47e1aec4609ee96fe70fcfa6ba2dbf`.
- Stage 2: `e86e2a54b307e4744a5d4874151ea2cb18f454f9`, annotated local tag
  `checkpoint/stage2-reviewed-e86e2a5`.
- Reviewed Stage 3: `ba3f692ccab17d3b25c4722b8d1489fc914f8c0a`, annotated
  local tag `checkpoint/stage3-reviewed-ba3f692`.
- Original Stage 3 review archive and Git recovery bundles remain separately
  preserved, unchanged. A new pre-push bundle captures the readiness commit too.
  Bundles require the existing baseline main history and have been verified.
- No rebasing or history rewriting; checkpoint commits remain ancestors.

## Confirmed Pages trigger

Read-only GitHub Pages API inspection reports:

- `build_type: legacy`; source branch **main**, source path **/**.
- Active GitHub-managed `pages-build-deployment` workflow; no checked-in workflow
  is added or modified by this branch.
- Latest successful deployment is main at `8b42cb4`, run
  [39754335898](https://github.com/pspedding/cc-economic-publication/actions/runs/39754335898).
- Thus the feature-branch push and PR do **not** change the configured Pages
  source. An approved merge to main is expected to trigger automatic publication;
  do not merge merely to stage a preview.
- The API reports canonical URL
  `https://pspedding.github.io/cc-economic-publication/` and `cname: null`.
  The production brief names `regionaldata.ai`, but its mapping is not established
  by this repository's Pages configuration. A direct web-tool read was unavailable.
  Confirm the intended domain/serving path before any deployment; do not change
  DNS, Pages source or destination as part of this PR.

## Rollback procedure — documentation only, not executed

Before merge, no production rollback is needed: close the PR or revise the feature
branch. Do not delete the checkpoints or force-update main.

If an explicitly approved future merge causes a regression:

1. Record the actual merge/squash commit and last successful deployment SHA. The
   current pre-feature baseline is `8b42cb4`; do not assume it is still current if
   unrelated approved changes have subsequently landed.
2. Fetch origin and create a new rollback branch from the then-current main.
3. Revert the actual integration commit: `git revert -m 1 <merge-commit>` for a
   two-parent merge, or `git revert <squash-commit>` for a squash merge. For a
   rebase merge, review/revert the actual feature commits newest-first. Resolve
   conflicts without discarding unrelated main changes. Never reset/force-push main.
4. Verify the affected HTML/CSS/JS and generated data against the pre-merge parent,
   run the appropriate baseline tests and open a rollback PR. The feature tests
   may correctly disappear when their feature is reverted; do not restore them
   just to make the feature validation commands applicable to the baseline.
5. Obtain explicit approval before merging the rollback PR: a main update also
   triggers Pages publication. Verify the deployment run and served asset/data
   versions afterward. The master workbook and scheduler need no rollback because
   this change never modifies them.

## Retained limitations and release gates

- Browser navigation remains policy-blocked. Offline tests are not rendered
  desktop/mobile, canvas, CDN, hover/touch or print acceptance. Independent package
  review reported no obvious blocker; this is not a claim of successful browser
  testing. Manual preview checks are in `stage3-review.md`.
- The inherited missing-shifted-observation **same-month lead/lag fallback** remains
  unchanged and documented. Treat redesign as a separately reviewed enhancement.
- CRB remains excluded; existing data lags/nulls remain transparent. Cash-rate
  effective-date snapshots and monthly-average yields are explicitly distinguished.
- No CI test workflow is introduced; these results were run locally in the full
  repository. Check for any new server-side PR checks before eventual merge.
- Merge, live publication, domain changes and automated monthly updates remain
  separate approval gates.
