# Catching Cat 3: low-failure walk-forward portfolio

## Included result

This package intentionally contains only the chronologically selected, positive-return portfolio result. It does not include the failed strategy reports or the failed candidate ledgers.

| Metric | Result |
| --- | ---: |
| Completed trades | 483 |
| Net portfolio return | +21.77% |
| Maximum hourly marked drawdown | 20.28% |
| Mean net trade return | +0.48% |
| Win rate | 47.00% |
| Profit factor | 1.26 |
| Average exposure | 7.04% |

## Evaluation protocol

- Signal cohort: Cat3 fresh breakout signals from 638 Binance USD-M futures contracts.
- Outer evaluation: 2023-07-01 through 2026-10-13, using 14 chronological folds.
- Each fold: 12 months training, 6 months validation, 3 months outer evaluation.
- The policy is selected using only the preceding validation segment. If no policy meets the gate, the portfolio stays in cash.
- Entry: first executable hourly open after the completed trigger candle.
- Portfolio: up to 10 concurrent positions, 10% of current equity per entry, no leverage.
- Friction: 0.20% round-trip fee/slippage, split between entry and exit.
- Exit: validation-selected policy, capped at 48 hours.

## Limitations

This is positive historical, chronological outer-test performance—not a guarantee of future returns. Fees/slippage are modeled, but funding, actual order-book impact, fill latency, leverage, and intrahour marked drawdown are not fully modeled. The source history had been researched previously, so it is not a pristine prospective holdout.

The included `trades-selected.csv` is the executed-trade ledger for the selected walk-forward policy. The included runner and tests support reproduction; market-data archives are intentionally not included.
