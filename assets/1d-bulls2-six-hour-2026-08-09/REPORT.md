# 1D Bulls2 six-hour intraday backtest

Generated: 2026-08-09T07:08:12.946Z

## Conclusion: NO ROBUST SIX-HOUR EDGE

No combination supplied robust deployable evidence. Development-only winners are not profitability evidence; keep Bulls2 watch-only and do not deploy these rules.

## All ten preregistered combinations

| Combination | Stage | Status | Eligible | Trades | Fill rate | Expectancy | PF | Median R | Win rate | Max DD R | Loss streak | Mean/median hours | Fees (R) | Slippage (R) | Bootstrap 95% CI | Holm adjusted p | Gate reasons | Matched baseline |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| c01-score40-immediate  | development | evaluated | 7730 | 7720 | 99.9% | -0.945 | 0.282 | -1.055 | 36.5% | 7308.647 | 37 | 3.673/4.000 | 3442.694 | 3442.694 | -1.084 to -0.818 | 1.0000 (not reject) | expectancy-not-positive; profit-factor-below-1.15; median-r-below-zero; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c01-score40-immediate  | validation | evaluated | 2584 | 2584 | 100.0% | -0.860 | 0.300 | -1.054 | 35.9% | 2227.604 | 29 | 3.835/4.000 | 1016.965 | 1016.965 | -1.194 to -0.580 | 1.0000 (not reject) | expectancy-not-positive; profit-factor-below-1.15; median-r-not-positive; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c01-score40-immediate  | holdout | sealed | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A/N/A | N/A | N/A | N/A | N/A | validation-gate-failed | N/A |
| c02-score60-immediate  | development | evaluated | 1641 | 1641 | 100.0% | -2.075 | 0.146 | -1.065 | 34.1% | 3413.537 | 21 | 3.527/3.000 | 1643.964 | 1643.964 | -2.576 to -1.627 | 1.0000 (not reject) | expectancy-not-positive; profit-factor-below-1.15; median-r-below-zero; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c02-score60-immediate  | validation | evaluated | 660 | 660 | 100.0% | -2.137 | 0.134 | -1.074 | 32.7% | 1413.460 | 23 | 3.753/4.000 | 663.917 | 663.917 | -3.429 to -1.179 | 1.0000 (not reject) | expectancy-not-positive; profit-factor-below-1.15; median-r-not-positive; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c02-score60-immediate  | holdout | sealed | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A/N/A | N/A | N/A | N/A | N/A | validation-gate-failed | N/A |
| c03-score80-immediate  | development | evaluated | 21 | 21 | 100.0% | -0.171 | 0.726 | -1.036 | 42.9% | 7.268 | 5 | 3.667/4.000 | 1.796 | 1.796 | -0.636 to 0.304 | 1.0000 (not reject) | trade-count-below-100; expectancy-not-positive; profit-factor-below-1.15; median-r-below-zero; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c03-score80-immediate  | validation | evaluated | 16 | 16 | 100.0% | -0.513 | 0.360 | -1.153 | 25.0% | 9.511 | 4 | 3.250/3.000 | 1.558 | 1.558 | -0.922 to -0.123 | 1.0000 (not reject) | trade-count-below-40; expectancy-not-positive; profit-factor-below-1.15; median-r-not-positive; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c03-score80-immediate  | holdout | sealed | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A/N/A | N/A | N/A | N/A | N/A | validation-gate-failed | N/A |
| c04-score40-relvol-confirm  | development | evaluated | 134 | 91 | 67.9% | -0.537 | 0.396 | -1.063 | 31.9% | 50.427 | 8 | 3.088/2.000 | 18.342 | 18.342 | -0.811 to -0.274 | 1.0000 (not reject) | trade-count-below-100; expectancy-not-positive; profit-factor-below-1.15; median-r-below-zero; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c04-score40-relvol-confirm  | validation | evaluated | 30 | 23 | 76.7% | -0.323 | 0.594 | -1.042 | 34.8% | 11.380 | 8 | 3.130/3.000 | 3.059 | 3.059 | -0.865 to 0.222 | 1.0000 (not reject) | trade-count-below-40; expectancy-not-positive; profit-factor-below-1.15; median-r-not-positive; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c04-score40-relvol-confirm  | holdout | sealed | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A/N/A | N/A | N/A | N/A | N/A | validation-gate-failed | N/A |
| c05-score60-relvol-confirm  | development | evaluated | 45 | 30 | 66.7% | -0.480 | 0.466 | -1.059 | 26.7% | 15.033 | 6 | 3.567/3.500 | 5.401 | 5.401 | -1.221 to 0.164 | 1.0000 (not reject) | trade-count-below-100; expectancy-not-positive; profit-factor-below-1.15; median-r-below-zero; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c05-score60-relvol-confirm  | validation | evaluated | 8 | 7 | 87.5% | 0.013 | 1.021 | -1.036 | 42.9% | 4.299 | 4 | 3.429/2.000 | 0.317 | 0.317 | -0.865 to 1.091 | 1.0000 (not reject) | trade-count-below-40; profit-factor-below-1.15; median-r-not-positive; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c05-score60-relvol-confirm  | holdout | sealed | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A/N/A | N/A | N/A | N/A | N/A | validation-gate-failed | N/A |
| c06-score80-relvol-confirm  | development | evaluated | 1 | 1 | 100.0% | -1.033 | 0.000 | -1.033 | 0.0% | 1.033 | 1 | 1.000/1.000 | 0.022 | 0.022 | -1.033 to -1.033 | 1.0000 (not reject) | trade-count-below-100; expectancy-not-positive; profit-factor-below-1.15; median-r-below-zero; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c06-score80-relvol-confirm  | validation | evaluated | 0 | 0 | 0.0% | 0.000 | 0.000 | 0.000 | 0.0% | 0.000 | 0 | 0.000/0.000 | 0.000 | 0.000 | N/A to N/A | 1.0000 (not reject) | trade-count-below-40; expectancy-not-positive; profit-factor-below-1.15; median-r-not-positive; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c06-score80-relvol-confirm  | holdout | sealed | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A/N/A | N/A | N/A | N/A | N/A | validation-gate-failed | N/A |
| c07-score40-support-retest  | development | evaluated | 5587 | 2575 | 46.1% | -0.455 | 0.416 | -1.070 | 33.7% | 1174.189 | 21 | 3.921/4.000 | 485.894 | 485.894 | -0.509 to -0.400 | 1.0000 (not reject) | expectancy-not-positive; profit-factor-below-1.15; median-r-below-zero; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c07-score40-support-retest  | validation | evaluated | 1873 | 860 | 45.9% | -0.378 | 0.484 | -1.079 | 34.8% | 325.172 | 27 | 3.757/4.000 | 128.225 | 128.225 | -0.505 to -0.250 | 1.0000 (not reject) | expectancy-not-positive; profit-factor-below-1.15; median-r-not-positive; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c07-score40-support-retest  | holdout | sealed | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A/N/A | N/A | N/A | N/A | N/A | validation-gate-failed | N/A |
| c08-score60-support-breakout  | development | evaluated | 1241 | 338 | 27.2% | -2.530 | 0.134 | -1.101 | 33.4% | 855.560 | 15 | 3.565/4.000 | 423.890 | 423.890 | -3.617 to -1.600 | 1.0000 (not reject) | expectancy-not-positive; profit-factor-below-1.15; median-r-below-zero; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c08-score60-support-breakout  | validation | evaluated | 510 | 137 | 26.9% | -3.864 | 0.092 | -1.108 | 31.4% | 537.368 | 10 | 3.248/3.000 | 262.128 | 262.128 | -7.932 to -1.249 | 1.0000 (not reject) | expectancy-not-positive; profit-factor-below-1.15; median-r-not-positive; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c08-score60-support-breakout  | holdout | sealed | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A/N/A | N/A | N/A | N/A | N/A | validation-gate-failed | N/A |
| c09-score60-btc-vwap  | development | evaluated | 420 | 254 | 60.5% | -1.682 | 0.113 | -1.065 | 40.9% | 427.291 | 8 | 2.870/2.000 | 190.075 | 190.074 | -2.717 to -0.860 | 1.0000 (not reject) | expectancy-not-positive; profit-factor-below-1.15; median-r-below-zero; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c09-score60-btc-vwap  | validation | evaluated | 127 | 74 | 58.3% | -0.967 | 0.159 | -1.101 | 36.5% | 72.776 | 8 | 2.865/2.000 | 23.486 | 23.486 | -2.058 to -0.334 | 1.0000 (not reject) | expectancy-not-positive; profit-factor-below-1.15; median-r-not-positive; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c09-score60-btc-vwap  | holdout | sealed | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A/N/A | N/A | N/A | N/A | N/A | validation-gate-failed | N/A |
| c10-score80-rs-volume-breakout  | development | evaluated | 21 | 2 | 9.5% | -0.027 | 0.723 | -0.027 | 50.0% | 0.192 | 1 | 6.000/6.000 | 0.071 | 0.071 | -0.192 to 0.139 | 1.0000 (not reject) | trade-count-below-100; expectancy-not-positive; profit-factor-below-1.15; median-r-below-zero; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c10-score80-rs-volume-breakout  | validation | evaluated | 16 | 4 | 25.0% | -0.575 | 0.304 | -1.066 | 25.0% | 3.304 | 3 | 3.000/2.000 | 0.224 | 0.224 | -1.143 to 0.485 | 1.0000 (not reject) | trade-count-below-40; expectancy-not-positive; profit-factor-below-1.15; median-r-not-positive; bootstrap-ci-not-strictly-positive; holm-adjusted-hypothesis-not-rejected | N/A |
| c10-score80-rs-volume-breakout  | holdout | sealed | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A/N/A | N/A | N/A | N/A | N/A | validation-gate-failed | N/A |

## Calendar-year stability

| Combination | Stage | Year | Trades | Net R | Expectancy | PF |
|---|---|---:|---:|---:|---:|---:|
| c01-score40-immediate | development | 2022 | 816 | -157.912 | -0.194 | 0.663 |
| c01-score40-immediate | development | 2023 | 2142 | -1899.406 | -0.887 | 0.295 |
| c01-score40-immediate | development | 2024 | 2299 | -2859.449 | -1.244 | 0.222 |
| c01-score40-immediate | development | 2025 | 2463 | -2382.250 | -0.967 | 0.285 |
| c02-score60-immediate | development | 2022 | 158 | -35.461 | -0.224 | 0.629 |
| c02-score60-immediate | development | 2023 | 416 | -721.887 | -1.735 | 0.171 |
| c02-score60-immediate | development | 2024 | 497 | -1425.318 | -2.868 | 0.090 |
| c02-score60-immediate | development | 2025 | 570 | -1222.895 | -2.145 | 0.160 |
| c03-score80-immediate | development | 2022 | 3 | -3.620 | -1.207 | 0.000 |
| c03-score80-immediate | development | 2023 | 6 | 0.396 | 0.066 | 1.134 |
| c03-score80-immediate | development | 2024 | 6 | -2.580 | -0.430 | 0.409 |
| c03-score80-immediate | development | 2025 | 6 | 2.210 | 0.368 | 2.007 |
| c04-score40-relvol-confirm | development | 2022 | 9 | -5.086 | -0.565 | 0.271 |
| c04-score40-relvol-confirm | development | 2023 | 34 | -19.083 | -0.561 | 0.407 |
| c04-score40-relvol-confirm | development | 2024 | 14 | -12.855 | -0.918 | 0.249 |
| c04-score40-relvol-confirm | development | 2025 | 34 | -11.818 | -0.348 | 0.520 |
| c05-score60-relvol-confirm | development | 2022 | 2 | -2.190 | -1.095 | 0.000 |
| c05-score60-relvol-confirm | development | 2023 | 9 | 0.530 | 0.059 | 1.096 |
| c05-score60-relvol-confirm | development | 2024 | 8 | -9.596 | -1.199 | 0.168 |
| c05-score60-relvol-confirm | development | 2025 | 11 | -3.133 | -0.285 | 0.592 |
| c06-score80-relvol-confirm | development | 2025 | 1 | -1.033 | -1.033 | 0.000 |
| c07-score40-support-retest | development | 2022 | 264 | -109.369 | -0.414 | 0.402 |
| c07-score40-support-retest | development | 2023 | 843 | -357.069 | -0.424 | 0.431 |
| c07-score40-support-retest | development | 2024 | 779 | -429.430 | -0.551 | 0.374 |
| c07-score40-support-retest | development | 2025 | 689 | -275.885 | -0.400 | 0.459 |
| c08-score60-support-breakout | development | 2022 | 30 | -19.621 | -0.654 | 0.251 |
| c08-score60-support-breakout | development | 2023 | 84 | -239.792 | -2.855 | 0.125 |
| c08-score60-support-breakout | development | 2024 | 102 | -322.925 | -3.166 | 0.092 |
| c08-score60-support-breakout | development | 2025 | 122 | -272.902 | -2.237 | 0.178 |
| c09-score60-btc-vwap | development | 2022 | 14 | -7.846 | -0.560 | 0.172 |
| c09-score60-btc-vwap | development | 2023 | 78 | -64.516 | -0.827 | 0.245 |
| c09-score60-btc-vwap | development | 2024 | 68 | -211.248 | -3.107 | 0.064 |
| c09-score60-btc-vwap | development | 2025 | 94 | -143.681 | -1.529 | 0.110 |
| c10-score80-rs-volume-breakout | development | 2023 | 1 | -0.192 | -0.192 | 0.000 |
| c10-score80-rs-volume-breakout | development | 2025 | 1 | 0.139 | 0.139 | N/A |
| c01-score40-immediate | validation | 2025 | 2183 | -2191.655 | -1.004 | 0.258 |
| c01-score40-immediate | validation | 2026 | 401 | -31.582 | -0.079 | 0.857 |
| c02-score60-immediate | validation | 2025 | 523 | -1382.099 | -2.643 | 0.106 |
| c02-score60-immediate | validation | 2026 | 137 | -28.498 | -0.208 | 0.657 |
| c03-score80-immediate | validation | 2025 | 11 | -6.171 | -0.561 | 0.344 |
| c03-score80-immediate | validation | 2026 | 5 | -2.038 | -0.408 | 0.406 |
| c04-score40-relvol-confirm | validation | 2025 | 19 | -10.337 | -0.544 | 0.390 |
| c04-score40-relvol-confirm | validation | 2026 | 4 | 2.904 | 0.726 | 3.174 |
| c05-score60-relvol-confirm | validation | 2025 | 5 | -2.346 | -0.469 | 0.454 |
| c05-score60-relvol-confirm | validation | 2026 | 2 | 2.437 | 1.219 | N/A |
| c07-score40-support-retest | validation | 2025 | 748 | -305.483 | -0.408 | 0.455 |
| c07-score40-support-retest | validation | 2026 | 112 | -19.688 | -0.176 | 0.715 |
| c08-score60-support-breakout | validation | 2025 | 117 | -536.049 | -4.582 | 0.065 |
| c08-score60-support-breakout | validation | 2026 | 20 | 6.683 | 0.334 | 1.676 |
| c09-score60-btc-vwap | validation | 2025 | 59 | -71.771 | -1.216 | 0.098 |
| c09-score60-btc-vwap | validation | 2026 | 15 | 0.226 | 0.015 | 1.041 |
| c10-score80-rs-volume-breakout | validation | 2025 | 3 | -1.242 | -0.414 | 0.447 |
| c10-score80-rs-volume-breakout | validation | 2026 | 1 | -1.057 | -1.057 | 0.000 |

## Statistical and execution notes

- Bootstrap inference resamples whole `detectedAt` clusters with seed 972; correlated signals at the same timestamp never separate.
- Within each stage, Holm correction is applied across exactly ten preregistered hypotheses. Promotion uses corrected holdout inference only; development and validation inference remain descriptive gate evidence.
- Matched baseline comparisons use Combination 1 on each candidate’s same eligible holdout signal population.
- Costs include the recorded market-fill fees and adverse slippage. Data/archive failures: 0.
- The holdout remained sealed for c01-score40-immediate, c02-score60-immediate, c03-score80-immediate, c04-score40-relvol-confirm, c05-score60-relvol-confirm, c06-score80-relvol-confirm, c07-score40-support-retest, c08-score60-support-breakout, c09-score60-btc-vwap, c10-score80-rs-volume-breakout because validation did not pass.
- This candle-level simulation omits order-book effects, partial fills, funding, latency, and market impact. Historical promotion would require a separate controlled forward trial.

## Reproduce

```powershell
node --test scripts/1d-bulls2-six-hour-report.test.cjs
node scripts/1d-bulls2-six-hour-report.cjs --input research/1d-bulls2/six-hour-20220701-20260630 --report docs/research/1d-bulls2-six-hour-intraday.md
```

