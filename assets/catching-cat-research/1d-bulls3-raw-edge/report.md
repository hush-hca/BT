# 1D Bulls3 intraday raw-edge gate

Generated: 2026-08-12T06:16:39.597Z

## Conclusion: NO VALIDATED THREE-HOUR RAW EDGE

No preregistered volume-conditioned group met the validation gate. Per the frozen research design, TP/SL combination search stops here to avoid manufacturing profitability through exit optimization.

## Data and scope

- Source events: 24335; deduplicated score-50+ events: 7409.
- Development / validation / sealed holdout: 4445 / 1480 / 1484.
- Official Binance USD-M Futures monthly 15m archive requests: 2736.
- Round-trip cost assumption: 0.200%.
- Enrichment failures: 0.

## Three-hour results

| Group | Stage | N | Mean net | Median net | Win rate | Mean MFE | Mean MAE | Gate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| all-score50 | development | 4445 | -0.167% | -0.272% | 37.278% | 1.284% | -1.152% | FAIL |
| v15-1.5 | development | 1716 | -0.007% | -0.302% | 38.520% | 1.714% | -1.305% | FAIL |
| v15-2.0 | development | 1130 | 0.049% | -0.330% | 38.496% | 1.946% | -1.389% | FAIL |
| v30-1.5 | development | 1748 | -0.059% | -0.316% | 38.043% | 1.641% | -1.294% | FAIL |
| v30-2.0 | development | 1057 | 0.113% | -0.248% | 40.019% | 1.943% | -1.353% | FAIL |
| bull-share-0.60 | development | 3904 | -0.174% | -0.288% | 37.423% | 1.319% | -1.181% | FAIL |
| bull-share-0.70 | development | 3470 | -0.168% | -0.296% | 37.550% | 1.342% | -1.195% | FAIL |
| v15-1.5+bull-0.60 | development | 1607 | -0.011% | -0.309% | 38.955% | 1.732% | -1.315% | FAIL |
| v30-1.5+bull-0.60 | development | 1653 | -0.072% | -0.323% | 37.931% | 1.650% | -1.311% | FAIL |
| v15-1.5+nonabsorb | development | 1673 | -0.002% | -0.335% | 39.450% | 1.755% | -1.337% | FAIL |
| v30-1.5+nonabsorb | development | 1706 | -0.055% | -0.337% | 38.921% | 1.679% | -1.324% | FAIL |
| all-score50 | validation | 1480 | -0.204% | -0.200% | 41.892% | 1.312% | -1.223% | FAIL |
| v15-1.5 | validation | 553 | -0.321% | -0.278% | 39.602% | 1.611% | -1.475% | FAIL |
| v15-2.0 | validation | 341 | -0.402% | -0.327% | 37.830% | 1.796% | -1.608% | FAIL |
| v30-1.5 | validation | 539 | -0.323% | -0.255% | 40.631% | 1.567% | -1.439% | FAIL |
| v30-2.0 | validation | 334 | -0.300% | -0.255% | 41.617% | 1.814% | -1.539% | FAIL |
| bull-share-0.60 | validation | 1291 | -0.233% | -0.211% | 41.751% | 1.319% | -1.250% | FAIL |
| bull-share-0.70 | validation | 1158 | -0.228% | -0.211% | 41.796% | 1.322% | -1.223% | FAIL |
| v15-1.5+bull-0.60 | validation | 511 | -0.340% | -0.289% | 39.139% | 1.643% | -1.494% | FAIL |
| v30-1.5+bull-0.60 | validation | 505 | -0.370% | -0.286% | 39.406% | 1.561% | -1.462% | FAIL |
| v15-1.5+nonabsorb | validation | 542 | -0.323% | -0.289% | 40.406% | 1.644% | -1.505% | FAIL |
| v30-1.5+nonabsorb | validation | 531 | -0.324% | -0.282% | 41.243% | 1.591% | -1.460% | FAIL |

## Validation horizon diagnostic

Every tested holding horizon was negative after costs. This check prevents a failed three-hour gate from hiding a shorter profitable raw edge.

| Group | 15m | 30m | 1h | 2h | 3h |
|---|---:|---:|---:|---:|---:|
| all-score50 | -0.194% | -0.174% | -0.189% | -0.228% | -0.204% |
| v15-1.5 | -0.212% | -0.188% | -0.230% | -0.309% | -0.321% |
| v15-2.0 | -0.206% | -0.200% | -0.240% | -0.367% | -0.402% |
| v30-1.5 | -0.216% | -0.209% | -0.203% | -0.274% | -0.323% |
| v30-2.0 | -0.238% | -0.198% | -0.187% | -0.233% | -0.300% |
| bull-share-0.60 | -0.184% | -0.173% | -0.190% | -0.252% | -0.233% |
| bull-share-0.70 | -0.185% | -0.181% | -0.188% | -0.243% | -0.228% |
| v15-1.5+bull-0.60 | -0.208% | -0.187% | -0.213% | -0.312% | -0.340% |
| v30-1.5+bull-0.60 | -0.219% | -0.228% | -0.212% | -0.298% | -0.370% |
| v15-1.5+nonabsorb | -0.213% | -0.188% | -0.231% | -0.311% | -0.323% |
| v30-1.5+nonabsorb | -0.216% | -0.209% | -0.203% | -0.275% | -0.324% |

## Safeguards

- Only the first 0Day qualification per symbol and daily candle is counted.
- The holdout remains sealed at this stage.
- All volume features use completed 15m candles preceding the decision time.
- Results include 0.05% taker fee and 0.05% adverse slippage on each market fill.
- No BTC filter, trailing stop, fixed-R target, or previous strategy configuration is evaluated.
