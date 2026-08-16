# W-Pattern Neckline-Retest Backtest

## Result

Across BTC, ETH, SOL, PEPE, and DOGE, the shared baseline portfolio executed **70 trades**, produced **27.18 net R** and **29,531.77 USDT** net P&L, and finished at **129,531.77 USDT** (29.53%). The net win rate was **41.4%**, profit factor was **2.01**, and maximum closed-equity drawdown was **7.18%**. These are historical mechanical-test results, not a recommendation.

## Per-asset baseline

Each asset row is an independent 100,000-USDT simulation; the combined row uses one shared portfolio. Unequal observation periods are explicit.

| Scope | Start | End | Bars | W candidates | Breakouts | Valid retests | Trades | Win rate | Net R | Profit factor | Return |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| BTCUSDT | 2017-08-18 | 2026-08-15 | 3285 | 121 | 77 | 35 | 21 | 47.6% | 9.74 | 2.24 | 10.01% |
| ETHUSDT | 2017-08-18 | 2026-08-15 | 3285 | 123 | 73 | 29 | 19 | 47.4% | 8.77 | 2.65 | 9.00% |
| SOLUSDT | 2020-08-12 | 2026-08-15 | 2195 | 56 | 29 | 18 | 12 | 25.0% | 1.49 | 1.31 | 1.42% |
| PEPEUSDT | 2023-05-06 | 2026-08-15 | 1198 | 11 | 9 | 6 | 5 | 40.0% | 1.36 | 1.63 | 1.32% |
| DOGEUSDT | 2019-07-06 | 2026-08-15 | 2598 | 102 | 61 | 25 | 13 | 38.5% | 5.82 | 2.35 | 5.87% |
| **COMBINED** | — | 2026-08-15 | 12561 | 413 | 249 | 113 | **70** | **41.4%** | **27.18** | **2.01** | **29.53%** |

Combined exits: 29 profitable, 41 losing, 15 breakeven-stop, 8 timed, and 2 end-of-data. Mean/median net result was 0.39/-0.01 R; mean/median holding time was 25.8/21.0 daily bars. Maximum concurrent modeled risk was 4.00% of equity.

## Rules and execution model

- Binance spot 1-day UTC OHLCV through 2026-08-15; each symbol starts at its first retained complete daily candle.
- A pivot uses three candles on each side and is known only after the third right candle closes.
- The two troughs are 5–60 bars apart and within 3%; both sit within 2% of a support zone established by at least two earlier confirmed pivot lows.
- The neckline is the highest intervening high. A close above it must occur within 60 bars, followed within 30 bars by a candle intersecting the ±1% neckline band and closing at or above the neckline.
- Entry is the following daily open. The initial stop is 1% below the lower trough; target is 2R. Touching 1R moves the stop to entry starting on the next candle.
- An already-active stop wins ambiguous same-candle paths. Trades time out after 60 managed bars at the following open; remaining positions exit at the final close.
- Costs are 10 bps on entry and exit. Each entry risks 1% of current equity, with at most one open trade per symbol; exits precede entries on the same date.
- Profit factor is positive net P&L divided by the absolute value of negative net P&L. It is infinity when gains exist with no losses, and NaN when neither gains nor losses exist.

## Sensitivity

All 27 combinations of trough similarity (2%, 3%, 5%), support tolerance (1%, 2%, 3%), and retest tolerance (0.5%, 1%, 2%) were run on the same sample. Trade counts ranged **29–101** (median 69.0), mean net R ranged **0.23–0.42** (median 0.35), finite profit factors ranged **1.46–2.22** (median 1.88), and total net R ranged **11.59–27.18** (median 23.29). This grid is diagnostic and is not out-of-sample optimization.

## Limitations

- W-pattern and support rules are mechanical approximations of discretionary chart reading.
- Daily OHLC bars hide intraday paths; conservative threshold ordering is assumed rather than observed.
- Binance listing dates create unequal histories, especially for PEPE.
- Spot-only selection excludes delisted assets and introduces survivorship/selection bias.
- Fees and fills are simplified. Market impact, changing spreads, taxes, funding, and borrow costs are excluded.
- The sensitivity grid reuses the same sample and does not establish out-of-sample validity or statistical significance.
- Historical performance is not a guarantee and is not financial advice.

## Reproduction and files

Prerequisites are Python 3.11 or newer, internet access to Binance's public spot API for an uncached run, and the pinned packages in `requirements.txt`. From this packaged study directory, create a virtual environment with `python -m venv .venv`, then activate it with `. .venv/bin/activate` on macOS/Linux or `.\.venv\Scripts\Activate.ps1` in Windows PowerShell. Then run:

```text
python -m pip install -r requirements.txt
python backtest/run_backtest.py
```

On some Windows installations the Python launcher command is `py` instead of `python`. The run downloads or validates cached source candles, so it is not a zero-setup/offline reproduction. The CSVs are the numeric source for this report and its charts: `trades.csv`, `baseline_summary.csv`, `sensitivity_summary.csv`, and `equity_curve.csv`.
