# National and Sydney all-dwellings housing indicators

This approved release adds six monthly PropTrack Home Price Index series:

- `au_dwelling_mom`, `au_dwelling_yoy`, `au_dwelling_median_value`
- `sydney_dwelling_mom`, `sydney_dwelling_yoy`, `sydney_dwelling_median_value`

Coverage: April 2022–August 2026, 53 observations per series, 318 total.
Names deliberately omit the supplier prefix, while source attribution remains
PropTrack Home Price Index. These are not Central Coast REA average sale prices
and are not Cotality measures.

Growth is supplied by the publisher, not reconstructed from median values.
The accepted source proportions are represented as percentage-point numbers for
the existing `percent_direct` display convention. Median values remain AUD.
The historical compilation has mixed published precision and revision vintages;
formatted trailing zeros do not create extra precision. No accepted history is
interpolated, carried forward, silently revised or enriched with extra digits.

The PropTrack-supplied disclaimer is retained verbatim in the source notice under
National & Global Context, with a link alongside Data Explorer. Source links are
retained in each indicator's metadata. The project owner explicitly authorised
publication after supplying that disclaimer. Private source workbooks, Dropbox
configuration and approval correspondence are not included in this repository.

## Deterministic manual rebuild

The committed `data/sources/housing_approved.json` is the approved release snapshot.
Rebuild into an isolated output directory using the existing serializer:

```sh
python scripts/build_housing_release.py --baseline-ref f49d3d9 --output-root /tmp/housing-release-review/data
```

This reconstructs this particular approved release, not a future refresh. Select
and validate a new baseline explicitly for any later release. The script rejects
ID collisions with changed data, malformed dates and units, or incomplete source
coverage. It does not download data, update workbooks, publish or schedule work.

Existing automated monthly dashboard publication remains disabled. The separate
monthly extraction workflow is unchanged. A future unified-refresh update must
explicitly retain this approved six-series overlay; the existing ID-set guard
rejects a proposed 59-series refresh rather than silently dropping six indicators.
Any such workflow integration or source revision requires separate review.

## Regression and recovery

- Original 59 indicator objects and individual generated files unchanged.
- Active inventory grows from 59 to 65, active outputs from 60 to 66. Pre-existing
  inactive JSON artifacts remain untouched and are not counted as active outputs.
- Original 3,481 ordered Pearson results, 32 default chart datasets, analytical
  functions, source dates, correlation conventions and inherited lag fallback
  retained. Scatter continues strict same-month pairing.
- Private browser acceptance completed before release. Release tests additionally
  validate the production registry, metadata, tooltip units and source notice.
- Metadata tests' explicit inventory/source-link counts advance to 65 and 30;
  no analytical expectations are weakened. Frozen historical numerical regression
  scripts remain unchanged. `housing_release.test.js` is the additive,
  current-release comparison against the deployed pre-release baseline.

Pages publishes automatically from the root of `main`. A feature-branch push
alone is not a production release. Merge by a normal merge commit so that the
parent baseline remains recoverable. To roll back this release, prepare a new
reviewed PR reverting its merge commit using `git revert -m 1 <merge-commit>`;
merging that rollback triggers Pages. Do not reset or force-push main, alter the
source workbook, or change scheduling as part of rollback. The pre-release
baseline is `f49d3d94950527fd157a6a775ef7862c4002e95a`.
