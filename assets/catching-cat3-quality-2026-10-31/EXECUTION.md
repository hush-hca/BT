# Execution record

The user requested a plan and execution after approving the bounded entry/exit approach. The brainstorming skill kept this within the existing research workflow; no new product subsystem, deployment, or trades. The in-chat design was recorded as a frozen experiment protocol in PLAN.md before outcomes. An isolated existing research worktree was reused; unrelated untracked files were preserved.

## Implementation and verification

- Added research-only core, preparation, run, analysis, audit, report and replay scripts.
- Wrote tests before core implementation: initial run failed with missing module, then passed. Added ATR immutability/cash fallback and delayed 4H close causality tests.
- Full existing/application suite passed 596/596, including localhost integration with network permission. No tests disabled.
- Prepared 10,266 signals across 638 contracts. All 10,266 have continuous pre-breakout 4H ATR. Original selection cache, feature code, outcomes, BTC benchmark and source manifest hashes checked; raw price shards verify against recorded hashes.
- PLAN.md is immutable after preparation. Preparation records its hash. No thresholds or gates retuned after evaluating results.

## Scope boundaries

Original funding and historical orderbook impact are not available. Returns are after assumed fees/slippage, before funding. Historical data has been used in prior experiments, so chronological tests are not prospective proof. Random thinning compares event quality, not capital exposure. No risk-sizing, trailing-stage tuning, live scanner update, or prospective test is included.

Execution results, accounting audit and reproducibility status are recorded after completion below.

## Completed measurements

All 14 folds and 1,344 validation runs completed. Ninety-six fixed outer diagnostics plus four selected-policy/stress portfolios completed. The unchanged control reproduced the prior 3,410 trades and -97.716625% return. Ten quarters selected models; four stayed cash. The continuous selected path completed 483 trades, +21.7702% return, 20.2840% close-marked drawdown, 46.9979% win rate and 1.25593 per-trade-return profit factor. At0.5% friction return was +5.3724%; at1% it was -17.1926%; one-hour-delay return +23.6059%.

Selected-filter signal failure fell from40.6478% to24.0793%, but stagnant-loss frequency rose from39.8843% to44.1926%. Fixed ABC had lower signal failure15.9292%, while ABC/hold48/filter-first returned37.7835% with10.3981% drawdown. Fixed BC/hold48/filter-first returned60.0533% with19.9187% drawdown. These full-period diagnostic comparisons are hindsight leads, not chosen winners. Selected bear evidence is only22 trades; BC/ABC hold48 filter-first have one bear trade each. Do not claim all-regime robustness.

Independent accounting audit passed for all100portfolios,100,301trades and2,880,000hourly close-NAV records. Source-price exit paths, stop/scheduled timing, membership, costs, quantities and cash reconcile. ATR reconstruction uses the same tested helper; cash/exit-path reconstruction is separate. No production adoption.

Full raw-ATR preparation, fits/validation, 100 outer portfolios, statistical diagnostics and report replay passed: 124 result files byte-identical. All 23 report links resolve. Source and protocol hashes unchanged. All 596 tests passed. These checks establish computational reproducibility, not prospective profitability. Research-only commit/push attempted under the user's standing instruction; no force push or authentication bypass.
