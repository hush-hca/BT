# Daily W-Pattern Report Dashboard Integration Design

## Objective

Add the completed 2026-08-16 daily W-pattern neckline-retest backtest to the BT Lab dashboard as a new bilingual BT Lab report. Preserve the separate nine-study Catching Cat archive and all existing legacy reports without changing their numerical meaning.

## Placement and Identity

- Dashboard group: `BT Lab`, using the existing legacy-report selector path.
- Stable report ID: `daily-w-pattern-neckline-retest-2026-08-16`.
- Report date: `2026-08-16`.
- English title: `Daily W-Pattern Neckline Retest`.
- Korean title: `일봉 W 패턴 넥라인 리테스트`.
- Timeframe: `Daily`.
- Assets: `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `PEPEUSDT`, and `DOGEUSDT`.

The report must not be added to `researchReports`, `researchLineage`, or `assets/catching-cat-research`. Those structures remain exactly nine records and retain their current controlled-verdict policy.

## Report Content

The selector entry opens a completed-report view containing:

- a bilingual description explaining that the strategy enters at the next daily open after a post-breakout neckline retest of a support-qualified W;
- a bilingual status banner with the combined baseline results: 70 trades, 27.18 net R, 29.53% return, 2.01 profit factor, and 7.18% maximum closed-equity drawdown;
- an explicit statement that the figures are historical in-sample mechanical-test results and not financial advice;
- one baseline configuration with per-asset rows; and
- four charts: combined closed equity, drawdown, independent per-asset net R, and sensitivity robustness.

The baseline per-asset table uses the legacy multi-asset columns with values sourced exactly from `baseline_summary.csv`:

| Asset | Trades | Win rate | Mean net R | Profit factor |
|---|---:|---:|---:|---:|
| BTCUSDT | 21 | 47.6190% | 0.463867 | 2.236624 |
| ETHUSDT | 19 | 47.3684% | 0.461778 | 2.651202 |
| SOLUSDT | 12 | 25.0000% | 0.123866 | 1.307160 |
| PEPEUSDT | 5 | 40.0000% | 0.271174 | 1.632457 |
| DOGEUSDT | 13 | 38.4615% | 0.447566 | 2.347326 |

The existing table heading `Expectancy R` remains numerically correct because the displayed value is mean net R per trade. Configuration ID `1` identifies the frozen baseline and is not presented as an optimization winner.

## W-Specific Rules

The current legacy `ruleCards()` assumes a bullish-candle/sweep configuration and cannot truthfully express this study. Extend the legacy report schema with an optional `customRules` bilingual array. Each item has `label: {ko, en}` and `value: {ko, en}`. When present, the renderer uses these cards; when absent, it uses the current `ruleCards()` unchanged.

The new report displays these rules:

1. Daily pivots: three candles left and right; confirmation after the third right candle.
2. Pre-existing support: at least two earlier confirmed pivot lows within 2%.
3. W troughs: 5–60 bars apart and within 3% of each other.
4. Breakout: first close above the intervening-high neckline within 60 bars.
5. Retest: first later candle intersecting the ±1% neckline band and closing at or above the neckline, within 30 bars.
6. Entry: next daily open.
7. Risk management: stop 1% below the lower trough, breakeven after 1R starting on the next candle, target 2R, 60-bar time exit.
8. Costs and sizing: 10 bps each side and 1% portfolio risk per entry.

## Renderer Compatibility Changes

Add only backward-compatible optional fields:

- `marketLabel`: explicit string used in the report eyebrow instead of the existing hard-coded six-altcoin label.
- `customRules`: bilingual rule cards described above.

The legacy renderer must:

- call a new report-aware rules helper that dispatches to custom cards only when the field exists;
- use `report.marketLabel` before its current `multiAsset`/`symbol` fallback;
- keep selector behavior, language switching, configuration expansion, file loading/copying, and all existing reports unchanged; and
- continue parsing numeric configuration IDs exactly as it does now.

No changes to the Catching Cat renderer or schema are permitted.

## Evidence and Chart Assets

Create `assets/daily-w-pattern-neckline-retest-2026-08-16/` and package only compact, auditable evidence:

- `SUMMARY.md` from the completed report;
- `baseline_summary.csv`;
- `sensitivity_summary.csv`;
- `trades.csv`;
- `equity_curve.csv`;
- `config.json`;
- `requirements.txt`; and
- a reproducible `backtest/` directory containing `run_backtest.py` and the `w_backtest` source modules required by it.

Do not package Binance candle caches, Python bytecode, pytest caches, Git metadata, or unrelated research files. The packaged runner must resolve its bundled `w_backtest` package from its own directory and write regenerated files inside the packaged study directory, not depend on paths in the source backtest workspace.

Copy charts to stable public paths:

- `charts/daily-w-pattern-equity-2026-08-16.png`;
- `charts/daily-w-pattern-drawdown-2026-08-16.png`;
- `charts/daily-w-pattern-assets-2026-08-16.png`; and
- `charts/daily-w-pattern-sensitivity-2026-08-16.png`.

The dashboard file viewer exposes the summary, baseline summary, sensitivity summary, trade ledger, frozen configuration, and runner. The chart images render directly in the report.

## Verification

Extend dashboard checks without weakening existing assertions:

- require the new report ID, headline metric strings, chart paths, and evidence paths in `app.js`;
- require all four chart files and the evidence directory files to exist;
- verify that the five per-asset anchor arrays match the source CSV values and signs;
- verify that both Korean and English title/status text are non-empty;
- add a renderer test proving `customRules` switches language and that an existing report still uses the original cards;
- preserve the exact nine Catching Cat IDs and existing anchor assertions; and
- run `npm run build` plus `git diff --check`.

After the automated gate passes, serve the static site locally and inspect the new report in both languages at desktop and narrow viewport widths. Check selector navigation, custom-rule expansion, all four charts, evidence loading, file copying, and unchanged legacy/Catching Cat navigation.

## Delivery Boundary

Commit the completed integration locally in the cloned `BT` repository. Do not push to GitHub, deploy to Vercel, or alter external state without separate user authorization.
