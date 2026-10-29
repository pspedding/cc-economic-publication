# Data Explorer monthly scatter — local review

## Isolation and integration

Feature branch: `feature/explorer-monthly-scatter`. Starting deployed main: `b5d92df6132948ec9a06d6a2f529cbd6e1620533`.

The new card immediately follows the existing Explorer time series. Compare Against supplies X; Primary Indicator supplies Y. One optional call at the end of `updateExplorer()` synchronizes the scatter after selection/reset/navigation changes. No existing correlation, lag, plotting or export function is replaced. Existing selections and default datasets are unchanged.

`scatter-analysis.js` is a pure monthly join/statistics module. `scatter-view.js` owns one extra Chart.js scatter instance and its controls. `scatter.css` is scoped to the new card. Chart.js remains pinned to 4.4.3. No plugins, framework, backend or data refresh dependency is added.

Design reference: [Moltbot's SA2 scatter](https://github.com/pspedding/nsw-regional-dashboard/blob/58948ad149047a6363d5d96ef525c2813682faa0/index.html#L1679), especially independent OLS/outlier toggles and formatted value tooltips. Its spatial clustering, global data structures and precomputed results are not imported. The residual threshold follows its `scripts/compute_outliers.py`.

## Data and statistical rules

- Normalize validated dates to calendar `YYYY-MM`, not row position or nearest date. Retain each source's original date in tooltips; cash-rate observations remain master effective-date snapshots, not monthly averages.
- Check both entire input series for duplicate months before filtering by range. Reject duplicates, even null duplicates or duplicates outside the selected range. Invalid dates also fail closed.
- Retain only months with a finite numeric observation in both sources; zero and negative values are valid. Exclude null, undefined, strings, NaN, infinity and unmatched months. Do not interpolate, shift, carry forward, aggregate or fall back.
- Scatter is always same-month/zero lag. The existing lag slider and its inherited fallback continue to apply only to the time-series view. The new Pearson r can differ from legacy r because pairing semantics differ.
- From/To are inclusive and scatter-specific. Default is all source history. Selection changes retain a selected boundary if available in the new source pair, otherwise reset that boundary to the new extent. All History restores the pair's full range without changing selected indicators or optional toggles. Invalid range clears the scatter and statistics rather than showing stale results.
- Plot valid points even when there are fewer than four. Require at least four paired months for r, R², OLS and residual diagnostics. Constant X or Y produces an explicit unavailable state for these diagnostics, not artificial zeros.
- Fit unweighted OLS of primary Y on compare X, including an intercept. Display the fitted line only within the observed X extent. Pearson r uses the identical finite paired sample; R² = r² for this simple regression. Calculation uses centered/scaled values for numerical stability. Round only displayed statistics/values, not inputs.
- Residual score is residual divided by sample residual standard deviation (`sqrt(sum(residual²)/(n−1))`, with the OLS zero-mean residual property). Flag absolute scores ≥ 1.75. Numerically perfect fits (normalized residual SD ≤ 1e−12) have no residual flags. This mirrors the SA2 descriptive rule; it is not a studentized residual test or a significance test.
- All points remain in calculations and fit. Flags use outlined triangles, not colour alone. Trend line, residual highlighting and year colours default off. Year colours stay stable across range changes; the six-colour palette cycles for histories longer than six years, with labelled year keys.
- Tooltips show month, both names and existing-format values, original source dates and any enabled flag explanation. Coincident points retain individual month labels. Hover, click, touchstart and touchmove are enabled; no connecting chronological line is implied by the scatter.

Serial dependence, common trends, overlapping annual growth rates, differing publication/measurement conventions and selection of a short window can create misleading associations. No causal claim, p-value, forecast or confidence interval is supplied. Reversing axes changes OLS and residuals, not the magnitude of Pearson correlation. Flags are exploratory and not necessarily data errors.

## Tests

From this worktree:

```sh
node --test tests/*.test.js
node tests/scatter_regression.js
/Users/openclaw-spedding/.openclaw/workspace/projects/macro-data-pipeline/.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
node tests/page_regression.js
```

The last command intentionally remains an expected failure at frozen legacy CPI dataset 22: the approved CPI release already changed September null to 4.5. It is not edited or disabled. `scatter_regression.js` separately compares against the actual deployed b5d92df baseline: all existing chart data, 3,481 Pearson pairs, 24 lag checks, legacy function source, all 59 indicator objects/60 generated outputs and tracked builder/data bytes must remain unchanged.

The offline DOM harness now models select `selectedIndex`. Its old reset assertion incorrectly expected the last assigned primary (`house_price`); it now asserts the actual first option (`unemployment`) to match unchanged browser reset code. This is a harness accuracy fix, not a production behaviour change. Existing historical regression assertions remain intact.

Additional tests cover strict joins, finite/zero/null handling, duplicate/invalid date rejection, OLS and Pearson reference cases, residual rules, constant/short samples, range filtering/error recovery, All History, selection changes, resets, stable year colours, tooltip content, optional controls, chart destruction and responsive configuration contracts.

## Local preview and browser limitation

```sh
python3 -m http.server 18766 --bind 127.0.0.1 --directory /Users/openclaw-spedding/.openclaw/workspace/projects/cc-economic-scatter
```

Open http://127.0.0.1:18766/#explorer on this Mac. The preview is currently running as a temporary local process, not a scheduled service. Restart with the command above if necessary. Stop the foreground command with Ctrl-C when review is finished.

The managed browser rejected navigation to this localhost URL with **"browser navigation blocked by policy"**. No alternate browser route, public tunnel or deployment was used. HTTP checks verify served HTML, data and scatter assets match worktree bytes; offline tests do not prove CSS layout, touch operation or rendering. **Desktop/mobile screenshots and actual browser acceptance remain outstanding.**

## Manual acceptance checklist

At desktop width 1440 and mobile widths 390/360:

1. Confirm the new card sits below—not instead of—the time series, with readable/wrapping controls and no new card-level horizontal overflow. The inherited site header overflow remains outside this scope.
2. Select primary CPI and compare Cash Rate; All History should show n = 54, Apr 2022–Sep 2026 valid paired months. Hover/tap September: CPI 4.50%, month 2026-09, cash-rate value and original source dates.
3. Move the legacy lag slider to 7: time-series label/correlation changes as before; scatter points/statistics remain unchanged. Toggle OLS, flags and year colours: sample size remains 54; legend and flags are readable, including by touch.
4. Restrict Jan–Sep 2026: n = 9, r = 0.149 and R² = 0.022. Restrict May–Sep 2026: the cash-rate sample is constant, so unavailable diagnostics are expected. Restore All History: n = 54, r = −0.618 and R² = 0.382. Reverse From/To: clear unavailable state; reset recovers.
5. Select primary Vacancy Rate and compare Cash Rate; All History: n = 52, ending Jul 2026. August/September missing values must not be plotted or filled.
6. Select 2Y versus 10Y bonds; confirm macro-versus-macro works. Select identical bond indicators; expect r = 1 and R² = 1, no residual flags. Choose October 2026 alone: no observations, unavailable diagnostics.
7. Use the existing Explorer Reset and correlation-panel Plot navigation; confirm shared selections synchronize both views. Check existing macro charts, exports and navigation for regression.
8. Capture desktop/mobile screenshots of the scatter, tooltip, options and unavailable states; check the browser console for errors. These checks are not yet claimed as passed.

No push, PR, merge, deployment, workbook write, generated-data update, scheduler activation or production service change is part of this implementation.
