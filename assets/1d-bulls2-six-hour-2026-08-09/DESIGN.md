# 1D Bulls2 Six-Hour Intraday Backtest Design

## Objective

Determine whether the existing 1D Bulls2 0Day signal can provide a reproducible long-only crypto day-trading edge when entries are delayed by five hours and every position is closed within six hours. This study tests exactly ten preregistered combinations. It does not modify Bulls2 or create a production scanner.

## Frozen scope

- Signal type: 0Day only. Exclude every 1Day observation.
- Minimum Bulls2 score: 40 for every combination.
- Market data: official Binance USD-M Futures 1H candles.
- Universe and liquidity rules: exactly the frozen Bulls2 Futures validation universe and its existing exclusions.
- Entry search begins at the first completed 1H candle whose close is at or after `detectedAt + 5 hours`.
- Entry search ends six hours after it begins. If no trigger occurs, record an unfilled signal.
- Maximum holding period: six hours from entry. Exit at the sixth completed hourly close if neither stop nor target has already executed.
- One open position per symbol. A later signal for the same symbol is ignored while a trade is open.
- Long trades only.
- No rule or threshold may be changed after validation results are inspected.

## No-lookahead calculations

All indicators use only candles completed by the decision timestamp.

- `ATR14`: Wilder-style 14-period ATR on completed 1H candles.
- `volumeMedian20`: median volume of the preceding 20 completed 1H candles, excluding the trigger candle.
- `sessionVWAP`: quote-value-weighted UTC-session VWAP through the latest completed 1H candle.
- `SMA200`: mean close of the latest 200 completed 1H candles.
- `SMA200 rising`: current SMA200 is greater than SMA200 calculated 12 completed hours earlier.
- `coinBtcRatio`: coin close divided by the time-aligned BTCUSDT close.
- `coinBtcSma20 rising`: current 20-hour SMA of `coinBtcRatio` is greater than its value five completed hours earlier.
- `supportDistancePct`: absolute distance between current price and frozen Bulls2 support, divided by support.

## Shared candle definitions

- Bullish confirmation: `close > open`, body is at least 50% of the full high-low range, and the close is in the upper 35% of the range.
- Bullish support retest: candle low touches the support zone from `support * 0.995` through `support * 1.01`, and the candle closes above support in the upper 30% of its range.
- First-five-hour high: the maximum high of the first five completed hourly candles after signal confirmation. It is frozen before any breakout entry is evaluated.
- Breakout: a later completed 1H candle closes strictly above the frozen first-five-hour high.

## Costs and execution

- Market entry and every exit: 0.05% taker fee per fill.
- Adverse slippage: 0.05% on each market fill.
- Stops and targets are evaluated from 1H OHLC candles.
- If a stop and target are both touched in one candle, the stop executes first.
- A time exit executes at the sixth completed hourly close after entry and includes exit fee and slippage.
- Results are expressed in net R after fees and slippage.
- Invalid or non-positive risk distances reject the trade rather than inventing a stop.

## Ten preregistered combinations

### Combination 1: score-40 baseline

- Filter: score at least 40.
- Entry: market entry at the first eligible completed hourly close at or after the five-hour delay.
- Stop: entry minus `1 * ATR14`.
- Exit: 1.5R target or six-hour time exit.

### Combination 2: score-60 baseline

- Filter: score at least 60.
- Entry: same immediate delayed market entry as Combination 1.
- Stop: entry minus `1 * ATR14`.
- Exit: 1.5R target or six-hour time exit.

### Combination 3: score-80 baseline

- Filter: score at least 80.
- Entry: same immediate delayed market entry as Combination 1.
- Stop: entry minus `1 * ATR14`.
- Exit: 1.5R target or six-hour time exit.

### Combination 4: low-threshold bullish confirmation

- Filter: score at least 40 and Bulls2 daily RelVol from 1.2 through 3.0 inclusive.
- Entry: first bullish confirmation within the six-hour entry window.
- Stop: trigger-candle low.
- Exit: 1.5R target or six-hour time exit.

### Combination 5: medium-threshold bullish confirmation

- Filter: score at least 60 and Bulls2 daily RelVol from 1.2 through 3.0 inclusive.
- Entry: first bullish confirmation within the six-hour entry window.
- Stop: entry minus `1 * ATR14`.
- Exit: 2R target or six-hour time exit.

### Combination 6: high-threshold bullish confirmation

- Filter: score at least 80 and Bulls2 daily RelVol from 1.2 through 3.0 inclusive.
- Entry: first bullish confirmation within the six-hour entry window.
- Stop: entry minus `1 * ATR14`.
- Exit: 2R target or six-hour time exit.

### Combination 7: support retest

- Filter: score at least 40 and `supportDistancePct <= 3%` at the five-hour observation point.
- Entry: first bullish support retest within the six-hour entry window.
- Stop: trigger-candle low minus `0.25 * ATR14`.
- Exit: 1.5R target or six-hour time exit.

### Combination 8: support-proximate breakout

- Filter: score at least 60 and `supportDistancePct <= 3%` at the five-hour observation point.
- Entry: first breakout after the first-five-hour high is frozen and within the six-hour entry window.
- Stop: entry minus `1 * ATR14`.
- Exit: 2R target or six-hour time exit.

### Combination 9: BTC and VWAP trend convergence

- Filter: score at least 60; coin close above rising coin SMA200; BTC close above rising BTC SMA200.
- Entry: first completed bullish candle closing above session VWAP within the six-hour entry window.
- Stop: entry minus `1 * ATR14`.
- Exit: close half at 1R; move the remaining stop to breakeven; close the remainder at 2R or the six-hour time exit.

### Combination 10: relative-strength volume breakout

- Filter: score at least 80; coin/BTC ratio above its rising 20-hour SMA; trigger volume greater than the preceding 20-hour median.
- Entry: first breakout meeting the relative-strength and trigger-volume filters within the six-hour entry window.
- Stop: trigger-candle low minus `0.25 * ATR14`.
- Exit: 2R target or six-hour time exit.

## Partitioning and experiment isolation

- Sort 0Day signals by `detectedAt`, then symbol as a deterministic tie-breaker.
- Keep signals with identical `detectedAt` entirely within one partition.
- Development: earliest approximately 60%.
- Validation: next approximately 20%.
- Sealed holdout: final approximately 20%.
- Report every combination on development and validation. Do not select parameters from the validation result.
- Open the holdout only for a combination that independently passes the validation gate.
- Combination 1 is the preregistered simple baseline for comparative promotion.

## Gates

Development eligibility:

- At least 100 filled trades.
- Net expectancy greater than zero.
- Profit factor at least 1.15.
- Median net R at least zero.

Validation eligibility:

- At least 40 filled trades.
- Net expectancy greater than zero.
- Profit factor at least 1.15.
- Median net R greater than zero.

Final promotion:

- At least 40 holdout trades.
- Holdout expectancy greater than zero.
- Holdout profit factor at least 1.20.
- Holdout median net R greater than zero.
- Better holdout expectancy and profit factor than Combination 1 on the same eligible signal population.
- Positive net expectancy in at least two distinct UTC calendar years represented in holdout.
- A 95% signal-cluster bootstrap confidence interval for mean net R must exclude zero after Holm correction across the ten hypotheses.

If no combination passes, the result is `NO ROBUST SIX-HOUR EDGE`. A development winner is never described as profitable evidence.

## Metrics and artifacts

For every combination and stage, report:

- eligible signals, filled trades, fill rate;
- net expectancy, profit factor, median R, win rate;
- maximum drawdown in R and maximum consecutive losses;
- average and median holding hours;
- fees and slippage in R;
- yearly trade count, net R, expectancy, and profit factor;
- bootstrap confidence interval and Holm-adjusted decision;
- rejection reason for each failed gate.

Write an auditable trade ledger containing signal, entry, stop, target, exit, costs, timestamps, combination ID, stage, and net R. Preserve archive and universe provenance, including missing-symbol failures.

## Deliverables

- A focused six-hour simulator with unit tests.
- A runner that evaluates exactly these ten combinations on 0Day only.
- Machine-readable metrics and trade ledger.
- A research report that states `PROMOTE`, `INCONCLUSIVE`, or `NO ROBUST SIX-HOUR EDGE` without modifying the production Bulls2 scanner.
- A copy of the verified research package in the BT repository after final review.

