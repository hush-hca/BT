# 1D Bulls2 execution validation

Generated: 2026-08-08T20:24:09.572Z

## Conclusion: NO ROBUST EXECUTION EDGE

0Day and 1Day failed the frozen validation gate. The holdout therefore remained sealed for 0Day and 1Day. No candidate was promotable. Development results are hypothesis-selection results, not deployable evidence. Bulls2 should remain a candidate/watch-only scanner; do not use these rules for live automated entry.

## Stage results

| Signal | Stage | Trades | Expectancy (R) | Profit factor | Median (R) | Win rate | Maximum drawdown (R) | Consecutive losses | Fees and slippage (R) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0Day | development (selected) | 165 | 0.245 | 1.552 | 0.214 | 50.9% | 11.153 | 15 | 6.874 |
| 0Day | validation: evaluated | 55 | -0.320 | 0.541 | -1.013 | 27.3% | 23.011 | 14 | 1.420 |
| 0Day | holdout: not-evaluated | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| 1Day | development (selected) | 226 | 0.701 | 2.950 | 0.082 | 52.2% | 15.185 | 10 | 5.172 |
| 1Day | validation: evaluated | 51 | -0.616 | 0.123 | -1.010 | 15.7% | 31.434 | 19 | 1.036 |
| 1Day | holdout: not-evaluated | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A |

## Frozen development selections

- **0Day:** `breakout:support:fixed:1.5:score0:relvol-1-4` - breakout entry; support stop; 1.5R fixed target; minimum score 0; relvol-1-4. Eligible signals 10388, fill rate 1.6%.
- **1Day:** `breakout:sweep:time:14:score70:relvol-1-4` - breakout entry; sweep stop; 14-day time exit; minimum score 70; relvol-1-4. Eligible signals 581, fill rate 38.9%.

## Decision evidence

- 0Day validation: 55 trades, -0.320 R expectancy, 0.541 profit factor, and -1.013 R median.
- 1Day validation: 51 trades, -0.616 R expectancy, 0.123 profit factor, and -1.010 R median.
- Required validation gate: at least 30 trades, positive expectancy, profit factor at least 1.15, and non-negative median R. Failed in this run: 0Day, 1Day.
- Required final promotion gate: at least 30 holdout trades, positive expectancy, profit factor at least 1.20, positive median R, and documented improvement over the baseline. The runner does not calculate that baseline comparison, so a future absolute holdout pass alone would remain INCONCLUSIVE / NOT PROMOTABLE.

## By calendar year

These figures describe only trades actually exposed during development selection and validation; they do not repair the failed out-of-sample result.

| Signal | Stage | Year | Trades | Net R | Expectancy (R) | Profit factor |
|---|---|---:|---:|---:|---:|---:|
| 0Day | development | 2022 | 23 | -7.811 | -0.340 | 0.520 |
| 0Day | development | 2023 | 60 | 42.242 | 0.704 | 3.598 |
| 0Day | development | 2024 | 26 | 0.524 | 0.020 | 1.040 |
| 0Day | development | 2025 | 56 | 5.544 | 0.099 | 1.201 |
| 0Day | validation | 2025 | 40 | -12.339 | -0.308 | 0.546 |
| 0Day | validation | 2026 | 15 | -5.288 | -0.353 | 0.528 |
| 1Day | development | 2022 | 14 | 1.774 | 0.127 | 1.243 |
| 1Day | development | 2023 | 44 | 30.779 | 0.700 | 2.550 |
| 1Day | development | 2024 | 92 | 116.952 | 1.271 | 5.875 |
| 1Day | development | 2025 | 76 | 8.896 | 0.117 | 1.296 |
| 1Day | validation | 2025 | 43 | -29.547 | -0.687 | 0.103 |
| 1Day | validation | 2026 | 8 | -1.886 | -0.236 | 0.353 |

## Methodology

- Universe/data: unchanged Bulls2 Futures validation set, 2022-07-01 through 2026-06-30 UTC; 13 archive enrichment failures were recorded.
- Search: 1152 configurations for 0Day and 1152 for 1Day. Signals were split chronologically 60% development, 20% validation, and 20% sealed holdout without splitting identical detection timestamps.
- Exact split counts: 0Day 10388 / 3460 / 3465; 1Day 4211 / 1392 / 1406 (development / validation / holdout).
- Entry search began five hours after signal validity and expired after 72 hours. Tested breakout, support-retest, and support-limit entries; support, sweep-low, and ATR stops; fixed, split, and time exits.
- Costs: taker fee 0.05% plus 0.05% adverse slippage per market fill; support-limit entry used 0.02% maker fee and no entry slippage. Stops won same-candle stop/target ambiguity.
- Selection used development only. Validation failure for 0Day, 1Day stopped those pipelines before holdout.

## Practical use

- Treat a Bulls2 hit as a research/watchlist candidate, not a buy signal.
- Do not deploy the rejected execution rules live; validation failed for 0Day and 1Day.
- If further research is performed, register a materially new hypothesis first and preserve the untouched holdout. Do not tune against validation losses and call the result confirmed.

## Limitations

- This is candle-level simulation, not tick/order-book execution. Intrabar ordering is unknown and was handled conservatively.
- Survivorship, exchange listing history, gaps in public archives, latency, partial fills, market impact, funding, and borrowing constraints may differ from live trading.
- The broad configuration search creates selection risk; positive development metrics followed by failed validation are consistent with overfitting.
- No claim of profitability is made, and the sealed holdout for 0Day and 1Day supplies no performance estimate.

## Reproduce

```powershell
node --test scripts/1d-bulls2-execution-core.test.cjs scripts/1d-bulls2-execution-runner.test.cjs scripts/1d-bulls2-execution-report.test.cjs
node scripts/1d-bulls2-execution-runner.cjs --input research/1d-bulls2/20220701-20260630-futures --out research/1d-bulls2/execution-20220701-20260630
node scripts/1d-bulls2-execution-report.cjs --input research/1d-bulls2/execution-20220701-20260630 --report docs/research/1d-bulls2-profitable-execution.md
```
