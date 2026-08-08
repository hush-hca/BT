# 1D Bulls2 validation evidence

Source: `research/1d-bulls2/20220701-20260630-futures`

Virtual entry: the close of the 1-hour candle ending five hours after first validity. Bulls2 itself is unchanged.

## Run metadata

```json
{
  "range": {
    "start": "2022-07-01T00:00:00.000Z",
    "endExclusive": "2026-07-01T00:00:00.000Z",
    "dailyWarmupDays": 70,
    "outcomeHorizonDays": 30
  },
  "counts": {
    "symbolsRequested": 184,
    "symbolsCompleted": 184,
    "failures": 0,
    "observations": 24335,
    "bySignalType": {
      "0Day": 17323,
      "1Day": 7012
    }
  },
  "universe": {
    "candidateMarket": "Binance USD-M monthly Futures archive symbols",
    "rankingMetric": "sum of quoteVolume for final 24 completed 1h candles on UTC as-of date",
    "candidatePoolCap": 552,
    "finalCap": 184,
    "requireBinanceSpotAndArchivedUsdtPerpetual": true,
    "domesticShareMustBeBelow": 0.4
  }
}
```

Failures recorded: 0.

## 0Day score distribution

Samples: 17323; bands: fixed.

### 0-39 (0.00–40.00; n=4389)

| Horizon | n | Mean return % | Median return % | Win rate | Median MAE % | Worst MAE % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1d | 4389 | -0.09 | -0.06 | 48.6% | -2.63 | -88.81 |
| 3d | 4389 | -0.16 | -0.46 | 46.5% | -4.90 | -89.12 |
| 7d | 4389 | 0.02 | -0.99 | 45.2% | -7.63 | -93.61 |
| 14d | 4389 | 0.15 | -2.08 | 43.6% | -10.85 | -93.61 |
| 30d | 4389 | 1.42 | -4.29 | 41.5% | -17.12 | -94.94 |

### 40-59 (40.00–60.00; n=10049)

| Horizon | n | Mean return % | Median return % | Win rate | Median MAE % | Worst MAE % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1d | 10049 | -0.15 | -0.15 | 47.3% | -2.55 | -79.26 |
| 3d | 10049 | -0.32 | -0.51 | 46.1% | -4.68 | -88.09 |
| 7d | 10049 | -0.38 | -1.10 | 44.9% | -7.59 | -88.09 |
| 14d | 10049 | -0.47 | -2.31 | 43.2% | -11.18 | -93.28 |
| 30d | 10049 | 1.13 | -4.61 | 40.5% | -16.81 | -95.21 |

### 60-79 (60.00–80.00; n=2835)

| Horizon | n | Mean return % | Median return % | Win rate | Median MAE % | Worst MAE % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1d | 2835 | -0.15 | -0.09 | 46.5% | -2.43 | -83.60 |
| 3d | 2835 | -0.08 | -0.17 | 46.2% | -4.32 | -83.60 |
| 7d | 2835 | -0.46 | -0.64 | 45.1% | -7.03 | -84.32 |
| 14d | 2835 | -0.27 | -1.01 | 45.7% | -10.15 | -84.32 |
| 30d | 2835 | 2.94 | -3.02 | 42.5% | -15.95 | -94.62 |

### 80-100 (80.00–100.00; n=50)

| Horizon | n | Mean return % | Median return % | Win rate | Median MAE % | Worst MAE % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1d | 50 | -0.54 | 0.01 | 50.0% | -2.46 | -20.23 |
| 3d | 50 | -0.24 | -0.44 | 40.0% | -4.07 | -36.01 |
| 7d | 50 | -0.23 | 1.17 | 56.0% | -5.67 | -44.54 |
| 14d | 50 | -0.03 | -2.90 | 42.0% | -9.11 | -44.54 |
| 30d | 50 | 4.36 | -5.08 | 44.0% | -14.98 | -76.56 |

### Execution filter evidence

| Filter | Evidence status | Present / total |
| --- | --- | ---: |
| Quote volume >= 1,000,000 | available | 17323 / 17323 |
| Relative volume 1.0–4.0 | available | 17323 / 17323 |
| ATR% 2–15% | skipped: missing contextual field | 0 / 17323 |
| Entry ≤3% above support | available | 17323 / 17323 |
| Constructive BTC context | skipped: missing contextual field | 0 / 17323 |
| 1h confirmation passed | skipped: missing contextual field | 0 / 17323 |

Holdout split: train 13858, holdout 3465; minimum train candidate sample: 278.

Frozen train-selected config: score >= 70; support-distance.

#### Train metrics

| Horizon | n | Mean return % | Median return % | Win rate | Median MAE % | Worst MAE % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1d | 496 | -0.56 | -0.03 | 41.9% | -2.05 | -83.60 |
| 3d | 496 | -0.74 | -0.04 | 43.5% | -3.57 | -83.60 |
| 7d | 496 | -0.14 | -0.06 | 44.4% | -6.14 | -83.60 |
| 14d | 496 | 0.34 | -0.03 | 47.2% | -8.38 | -83.60 |
| 30d | 496 | 4.86 | -0.01 | 49.2% | -13.13 | -83.60 |

#### Holdout comparison (single frozen config)

| Horizon | Baseline n | Candidate n | Baseline median return % | Candidate median return % | Baseline win rate | Candidate win rate | Delta return % | Delta win rate | Delta median MAE % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 7d | 3465 | 148 | -0.34 | -0.02 | 47.7% | 46.0% | 0.32 | -1.8% | 1.61 |
| 14d | 3465 | 148 | -0.94 | -0.03 | 46.4% | 46.0% | 0.91 | -0.5% | 0.94 |

#### Contextual incremental holdout comparison (against matching score-only baseline)

| Horizon | Baseline n | Candidate n | Baseline median return % | Candidate median return % | Baseline win rate | Candidate win rate | Delta return % | Delta win rate | Delta median MAE % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 7d | 161 | 148 | -0.02 | -0.02 | 46.0% | 46.0% | 0.00 | -0.0% | 0.01 |
| 14d | 161 | 148 | -0.45 | -0.03 | 43.5% | 46.0% | 0.42 | 2.5% | 0.34 |

Promotion provenance: eligible.

Absolute long-edge gate: for both 7d and 14d the holdout candidate must have median return > 0 and win rate > 50.0%.

Conclusion: **DO NOT PROMOTE**. Promotion requires eligible universe provenance, >=30 holdout observations, absolute long edge, plus 7d and 14d relative return-quality and median-MAE improvements versus the full same-signal population.

## 1Day score distribution

Samples: 7012; bands: fixed.

### 0-39 (0.00–40.00; n=1548)

| Horizon | n | Mean return % | Median return % | Win rate | Median MAE % | Worst MAE % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1d | 1548 | 0.01 | -0.23 | 45.5% | -2.58 | -22.46 |
| 3d | 1548 | -0.45 | -0.66 | 45.4% | -4.51 | -83.45 |
| 7d | 1548 | -0.72 | -1.37 | 43.5% | -7.56 | -93.66 |
| 14d | 1548 | -1.21 | -2.67 | 42.4% | -10.89 | -93.66 |
| 30d | 1548 | 0.52 | -5.18 | 39.7% | -16.52 | -95.02 |

### 40-59 (40.00–60.00; n=3242)

| Horizon | n | Mean return % | Median return % | Win rate | Median MAE % | Worst MAE % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1d | 3242 | 0.17 | -0.01 | 49.3% | -2.46 | -33.51 |
| 3d | 3242 | -0.10 | -0.49 | 46.2% | -4.63 | -83.77 |
| 7d | 3242 | -0.00 | -0.99 | 45.4% | -7.30 | -83.77 |
| 14d | 3242 | -0.11 | -2.48 | 42.6% | -10.96 | -85.12 |
| 30d | 3242 | 1.53 | -4.74 | 40.3% | -16.52 | -95.22 |

### 60-79 (60.00–80.00; n=2012)

| Horizon | n | Mean return % | Median return % | Win rate | Median MAE % | Worst MAE % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1d | 2012 | 0.06 | -0.20 | 46.3% | -2.70 | -26.58 |
| 3d | 2012 | 0.27 | -0.14 | 48.2% | -4.73 | -77.56 |
| 7d | 2012 | 0.15 | -0.61 | 46.4% | -7.06 | -77.82 |
| 14d | 2012 | 0.13 | -2.20 | 43.5% | -10.51 | -89.08 |
| 30d | 2012 | 2.54 | -3.56 | 42.5% | -16.07 | -91.22 |

### 80-100 (80.00–100.00; n=210)

| Horizon | n | Mean return % | Median return % | Win rate | Median MAE % | Worst MAE % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1d | 210 | 0.43 | -0.05 | 46.7% | -2.71 | -29.46 |
| 3d | 210 | 3.23 | 1.77 | 59.1% | -4.54 | -50.25 |
| 7d | 210 | 1.87 | 1.36 | 54.3% | -5.72 | -50.25 |
| 14d | 210 | 2.83 | 0.48 | 53.8% | -9.10 | -79.38 |
| 30d | 210 | 13.34 | -1.12 | 47.6% | -14.30 | -83.30 |

### Execution filter evidence

| Filter | Evidence status | Present / total |
| --- | --- | ---: |
| Quote volume >= 1,000,000 | available | 7012 / 7012 |
| Relative volume 1.0–4.0 | available | 7012 / 7012 |
| ATR% 2–15% | skipped: missing contextual field | 0 / 7012 |
| Entry ≤3% above support | available | 7012 / 7012 |
| Constructive BTC context | skipped: missing contextual field | 0 / 7012 |
| 1h confirmation passed | skipped: missing contextual field | 0 / 7012 |

Holdout split: train 5609, holdout 1403; minimum train candidate sample: 113.

Frozen train-selected config: score >= 80; no contextual filters.

#### Train metrics

| Horizon | n | Mean return % | Median return % | Win rate | Median MAE % | Worst MAE % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1d | 176 | 0.80 | -0.02 | 48.9% | -2.59 | -29.46 |
| 3d | 176 | 3.37 | 2.16 | 60.8% | -4.47 | -50.25 |
| 7d | 176 | 1.91 | 2.16 | 55.7% | -5.66 | -50.25 |
| 14d | 176 | 3.72 | 0.91 | 54.5% | -9.25 | -79.38 |
| 30d | 176 | 15.78 | -2.90 | 46.6% | -15.04 | -83.30 |

#### Holdout comparison (single frozen config)

| Horizon | Baseline n | Candidate n | Baseline median return % | Candidate median return % | Baseline win rate | Candidate win rate | Delta return % | Delta win rate | Delta median MAE % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 7d | 1403 | 34 | -1.86 | -0.19 | 42.0% | 47.1% | 1.67 | 5.0% | 1.80 |
| 14d | 1403 | 34 | -3.50 | 0.00 | 39.6% | 50.0% | 3.51 | 10.4% | 3.64 |

Promotion provenance: eligible.

Absolute long-edge gate: for both 7d and 14d the holdout candidate must have median return > 0 and win rate > 50.0%.

Conclusion: **DO NOT PROMOTE**. Promotion requires eligible universe provenance, >=30 holdout observations, absolute long edge, plus 7d and 14d relative return-quality and median-MAE improvements versus the full same-signal population.

