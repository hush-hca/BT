# 1D Bulls2 execution backtest

Four-year Binance USD-M Futures execution study for the existing 1D Bulls2 0Day and 1Day signals.

## Result

`NO ROBUST EXECUTION EDGE`

- 0Day validation: 55 trades, -0.320R expectancy, 0.541 profit factor, -1.013R median.
- 1Day validation: 51 trades, -0.616R expectancy, 0.123 profit factor, -1.010R median.
- Both frozen development candidates failed validation, so the final 20% holdout remained sealed.
- Bulls2 remains a watchlist/research candidate and is not validated as an automated entry strategy.

See [REPORT.md](./REPORT.md) for the full methodology, yearly breakdown, risks, and reproduction commands.

## Package contents

- `REPORT.md`, `DESIGN.md`, `PLAN.md`: conclusion and preregistered methodology.
- `selected-configuration.json`, `stage-metrics.csv`, `trade-ledger.csv`: auditable results.
- `1d-bulls2-execution-*.cjs`: simulator, runner, report generator, and tests.

