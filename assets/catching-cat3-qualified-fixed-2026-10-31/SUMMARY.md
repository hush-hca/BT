# Cat3: qualified fixed-policy diagnostics

## Scope

This package intentionally contains **only** the 12 Cat3 B-filter fixed policies that met the frozen full-period point-estimate gate: positive return, positive mean trade, at least 20 trades, required failure-rate improvement, and no higher stagnant-loss rate than the control.

It excludes failed, negative, and merely positive-but-not-qualified tests. These policies were identified after the full outer period was observed, so they are diagnostic results and **not** retrospectively deployable winners or prospective evidence.

## Common protocol

- Signal cohort: Cat3 fresh breakouts across Binance USD-M futures contracts.
- Outer history: 2023-07-01 to 2026-10-13, hourly next-open execution.
- Portfolio: up to 10 concurrent positions; 10% of current equity per entry; no leverage.
- Friction: 0.20% round-trip fee/slippage, split on entry and exit.
- Not modelled: historical funding, order-book impact, fill latency, and intrahour drawdown extremes.
- B filter: lowest training quintile of 7-day BTC-relative log return through the completed signal candle.
- Ranking: shortlist ranks the original shortlist before applying B; filterfirst applies B before ranking.

## Included fixed policies

| Policy | Trades | Net return | Max DD | Mean trade | Win rate | PF | Exposure |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| B-hold48-shortlist | 539 | +55.18% | 31.23% | +0.96% | 49.17% | 1.37 | 8.98% |
| B-hold48-filterfirst | 631 | +67.27% | 37.28% | +0.97% | 48.81% | 1.39 | 10.49% |
| B-fixed5-shortlist | 559 | +32.36% | 24.82% | +0.62% | 42.93% | 1.25 | 7.13% |
| B-fixed5-filterfirst | 651 | +42.60% | 27.15% | +0.66% | 43.63% | 1.28 | 8.49% |
| B-atr2-shortlist | 567 | +10.18% | 28.99% | +0.29% | 38.45% | 1.11 | 6.43% |
| B-atr2-filterfirst | 661 | +18.09% | 30.54% | +0.36% | 39.64% | 1.15 | 7.63% |
| B-atr3-shortlist | 551 | +29.75% | 32.77% | +0.62% | 44.65% | 1.22 | 7.72% |
| B-atr3-filterfirst | 650 | +35.12% | 34.80% | +0.60% | 44.46% | 1.23 | 9.09% |
| B-structure-shortlist | 581 | +31.39% | 23.14% | +0.58% | 35.97% | 1.26 | 5.85% |
| B-structure-filterfirst | 685 | +50.75% | 25.17% | +0.70% | 37.37% | 1.34 | 7.07% |
| B-stalled-shortlist | 583 | +10.49% | 29.64% | +0.27% | 36.54% | 1.11 | 6.42% |
| B-stalled-filterfirst | 679 | +19.99% | 32.15% | +0.37% | 37.85% | 1.16 | 7.70% |

Each packaged trades CSV file is the complete executed-trade ledger for its named policy.
