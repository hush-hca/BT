# 1D Bulls2 validation package

This package contains the reproducible 1D Bulls2 validation code and the final four-year Binance USD-M Futures report.

## Scope

- Validation period: 2022-07-01 through 2026-06-30 UTC
- Universe: 184 Binance USD-M Futures assets ranked by archived 24-hour quote volume as of 2026-06-30
- Signals: 17,323 `0Day` and 7,012 `1Day` observations
- Virtual entry: the 1-hour candle close five hours after first signal validity
- Result: `DO NOT PROMOTE` for both signal types; no Bulls3 scanner was created

See [SUMMARY.md](./SUMMARY.md) for the score distributions, train-selected configurations, holdout comparisons, and final decision.

## Included files

- `metadata.json`: run settings, provenance, universe criteria, and observation counts
- `universe.json`: exact ranked and filtered universe snapshot used by the run
- `failures.json`: symbol download failures; empty for the final run
- `1d-bulls2-validation-core.cjs`: frozen signal replay and outcome calculations
- `1d-bulls2-validation-runner.cjs`: official Binance Futures archive collector
- `1d-bulls2-validation-report.cjs`: score, filter, and chronological holdout analysis
- `*.test.cjs`: deterministic validation tests

The 24,335-row raw observation artifact is intentionally excluded. It can be regenerated from Binance's public archives with the runner.

## Verify

From this folder:

```powershell
node --test 1d-bulls2-validation-core.test.cjs 1d-bulls2-validation-runner.test.cjs 1d-bulls2-validation-report.test.cjs
```

The runner and report generator are preserved exactly as used in Catching Cat. Their default output paths assume the Catching Cat repository layout, so use them there for a full rerun or adapt the output paths for standalone research.
