# 1D Bulls2 six-hour intraday backtest

Four-year Binance USD-M Futures study of ten preregistered 0Day Bulls2 day-trading combinations.

## Frozen execution scope

- Bulls2 0Day only, score at least 40.
- Entry search begins five hours after signal confirmation.
- Entry search window and maximum holding period are both six hours.
- Exactly ten fixed combinations; 60/20/20 chronological development, validation, and sealed holdout.
- Fees, adverse slippage, stop-first candle ambiguity, and immediate already-triggered stops are modeled.

## Result

`NO ROBUST SIX-HOUR EDGE`

All ten combinations failed the validation gate, so all ten holdouts remained sealed. The study produced 17,038 auditable trades. Bulls2 should remain watch-only under these rules rather than being deployed as an automated six-hour long strategy.

See [REPORT.md](./REPORT.md) for the complete results.

## Package contents

- `DESIGN.md`, `PLAN.md`, `REPORT.md`: frozen method and verified conclusion.
- `combination-definitions.json`, `study-metadata.json`, `stage-metrics.csv`: study configuration and summaries.
- `signal-outcomes.json`, `trade-ledger.json`, `data-failures.json`: complete audit evidence.
- `1d-bulls2-six-hour-*.cjs`: simulator, runner, reporter, and tests.
- `1d-bulls2-validation-*.cjs`: required frozen-signal/archive dependencies.

