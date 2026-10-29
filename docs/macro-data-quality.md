# Monthly macro inputs — source quality review, 29 October 2026

These are feature-branch test inputs, not a production release. The original
additional workbook and production master are unchanged. `legacy_dashboard.json`
is the existing public bundle at base commit 8b42cb4, not a private workbook.

## ANZ–Roy Morgan

Authority is the [Australian completed-month historical table](https://www.roymorgan.com/morgan-poll/consumer-confidence-anz-roy-morgan-australian-cc-monthly-ratings),
not individual weekly releases or rolling averages. All 54 corrected headline
observations match that table. Provisional October is excluded.

| Month | Original | Correct monthly | Cause evidence |
|---|---:|---:|---|
| March 2024 | 82.2 | 82.0 | Original matches the 10 March weekly observation in the [12 March report](https://roymorgan-cms-prod.s3.ap-southeast-2.amazonaws.com/wp-content/uploads/2024/03/11224702/9435-ANZ-Roy-Morgan-Consumer-Confidence-March-12.pdf), not the monthly authority. |
| June 2024 | 79.9 | 79.5 | Original matches a four-week moving average in the [12 June report](https://roymorgan-cms-prod.s3.ap-southeast-2.amazonaws.com/wp-content/uploads/2024/06/11234610/9500-ANZ-Roy-Morgan-Consumer-Confidence-June-12.pdf), not the monthly authority. |
| April 2025 | 85.0 | 83.4 | Original matches the four-week moving average in the [29 April report](https://roymorgan-cms-prod.s3.ap-southeast-2.amazonaws.com/wp-content/uploads/2025/04/29001043/9720-ANZ-Roy-Morgan-Consumer-Confidence-April-29.pdf). |
| September 2026 | 70.5 | 74.6 | Original matches the late-September weekly result in the [29 September release](https://www.roymorgan.com/findings/10075-anz-roy-morgan-consumer-confidence-september-29). |

This is strong evidence of mixing frequencies/aggregations. The original import
history is unavailable, so numerical matches do not prove exactly which document
was copied. Corrections themselves are established from the monthly table only.

MoM/YoY index-point changes and ANZ-minus-Westpac were recomputed after correcting
headlines, retaining initial missing-value windows. The audit records 22 changes:
4 headlines, 7 MoM, 7 YoY and 4 cross-survey arithmetic differences, with original
and corrected values. No optional historical blank backfills were applied.

## Westpac–Melbourne Institute

RBA H3 [CSV](https://www.rba.gov.au/statistics/tables/csv/h3-data.csv) identifies
`GICWMICS`, monthly, seasonally adjusted, index units, source MI and description
Westpac–Melbourne Institute consumer sentiment. **54/54** supplied observations
match. RBA's [data availability page](https://www.rba.gov.au/chart-pack/data-availability.html)
expressly identifies H3 as its public source. Full-history provenance is therefore
verified; a subscription was not required. The ANZ-minus-Westpac field is labelled
only an arithmetic difference of differently constructed indices, not a calibrated
common-scale sentiment gap.

## Bond yields and other sources

The RBA F2.1 10Y series matches all 54 production-master observations. Reuse
`bond_yield_10yr`; do not create a competing 10Y indicator. Its legacy display
dates/metadata are preserved; the source observation joins by calendar month,
independently of cash-rate effective dates. New maturities use canonical monthly
dates and RBA's monthly-average, constant-maturity definitions.

NSW household and experimental retail series retain the Stage 1 ABS validation
and August 2026 release lag. They are not substitutes for Central Coast retail.
Source-specific blanks remain null. Exact IDs/basis are in macro_metadata.json.

Known unverified legacy `crb_index` is retained in the source registry/snapshot
but excluded from branch publication outputs. Its mislabeled RBA-like history
has not established a CRB benchmark. All other active legacy IDs, metadata and
observations are preserved; this is not an independent re-audit of every legacy
regional dataset. Four pre-existing orphan indicator JSON files were not active
in the original bundle; they are neither activated nor modified here.
