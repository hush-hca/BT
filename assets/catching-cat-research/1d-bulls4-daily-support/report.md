# 1D Bulls4 daily-support reversal backtest

Generated: 2026-08-12T07:27:22.968Z

## Conclusion: NO VALIDATED RAW EDGE

Bulls4 failed the frozen raw validation gate. Structural entry/exit optimization is stopped to avoid fitting exits to a signal without validated directional edge.

## Scope

- Universe symbols: 184; daily archive requests: 10120; failures: 0.
- Signals: 2657; development / validation / sealed holdout: 1597 / 529 / 531.
- Matched controls: 3151.
- Round-trip cost: 0.200%.

## Raw outcomes

| Stage | Horizon | Population | N | Mean net | Median net | Win rate |
|---|---:|---|---:|---:|---:|---:|
| development | 1d | signal | 1597 | -0.174% | -0.217% | 46.963% |
| development | 1d | away | 805 | -2.030% | -2.043% | 29.317% |
| development | 1d | touch | 1559 | 6.460% | 5.881% | 94.612% |
| development | 2d | signal | 1597 | -0.231% | -0.269% | 46.086% |
| development | 2d | away | 805 | -3.232% | -2.868% | 29.441% |
| development | 2d | touch | 1559 | 6.688% | 5.602% | 87.749% |
| development | 3d | signal | 1597 | -0.676% | -1.046% | 42.893% |
| development | 3d | away | 805 | -4.455% | -4.151% | 27.205% |
| development | 3d | touch | 1559 | 6.754% | 5.602% | 81.591% |
| validation | 1d | signal | 529 | 0.079% | -0.691% | 41.966% |
| validation | 1d | away | 308 | -1.338% | -0.682% | 41.234% |
| validation | 1d | touch | 479 | 6.724% | 6.028% | 95.825% |
| validation | 2d | signal | 529 | 0.271% | -0.145% | 48.771% |
| validation | 2d | away | 308 | -3.647% | -4.303% | 26.623% |
| validation | 2d | touch | 479 | 6.871% | 5.578% | 91.232% |
| validation | 3d | signal | 529 | -1.596% | -1.744% | 37.996% |
| validation | 3d | away | 308 | -4.458% | -5.471% | 23.052% |
| validation | 3d | touch | 479 | 7.607% | 6.697% | 83.507% |

## Validation gate

- Status: **FAIL**.
- Three-day signal: n 529, mean -1.596%, median -1.744%, win rate 37.996%.
- Mean-return uplift vs away control: 2.862%.
- Mean-return uplift vs touch control: -9.203%.
- Gate reasons: mean-return-not-positive; median-return-not-positive; win-rate-not-above-50-percent; no-positive-touch-control-uplift.

## Three-day score bands

| Stage | Score | N | Mean net | Median net | Win rate |
|---|---:|---:|---:|---:|---:|
| development | 0-49 | 339 | -1.175% | -1.047% | 42.478% |
| development | 50-59 | 369 | -0.304% | -0.870% | 44.173% |
| development | 60-69 | 482 | -1.187% | -1.456% | 40.871% |
| development | 70-79 | 310 | 0.102% | -0.565% | 45.161% |
| development | 80-100 | 97 | -0.298% | -0.272% | 42.268% |
| validation | 0-49 | 95 | -3.254% | -2.972% | 36.842% |
| validation | 50-59 | 116 | -3.226% | -1.783% | 32.759% |
| validation | 60-69 | 164 | 1.487% | -1.139% | 42.683% |
| validation | 70-79 | 123 | -3.678% | -2.527% | 34.146% |
| validation | 80-100 | 31 | 1.532% | 2.251% | 51.613% |

## Three-day calendar-year stability

| Stage | Year | N | Mean net | Median net | Win rate |
|---|---:|---:|---:|---:|---:|
| development | 2022 | 194 | 0.524% | -0.422% | 47.423% |
| development | 2023 | 332 | 0.078% | -0.215% | 46.386% |
| development | 2024 | 613 | 0.879% | -0.003% | 49.918% |
| development | 2025 | 458 | -3.812% | -4.146% | 29.039% |
| validation | 2025 | 529 | -1.596% | -1.744% | 37.996% |

## Research safeguards

- Signals use completed Binance UTC daily candles and causal support zones.
- Controls are prior same-symbol, same-quarter observations matched without replacement.
- The final 20% holdout has no evaluated outcomes at this stage.
- No BTC filter, trailing stop, fixed-R target, or Bulls3 parameter is reused.
- Structural execution status: stopped-raw-edge-gate-failed.
