# 1D Bulls2 Profitable Execution Research Design

## Objective

Determine whether an executable long strategy can be built around unchanged 1D Bulls2 daily-support signals. Bulls2 remains a broad candidate generator; the research tests whether post-signal confirmation, explicit risk, and mechanical exits create a repeatable positive edge.

## Data and signal boundary

- Preserve current Bulls2 0Day/1Day detection and scoring without modification.
- Use the same Binance USD-M Futures archive universe and four-year period already validated: 2022-07-01 through 2026-06-30 UTC.
- Reconstruct every decision using only 1-hour candles closed at that time.
- Begin searching for an entry five hours after the signal first becomes valid.
- Cancel an unfilled candidate after 72 hours.
- Evaluate 0Day and 1Day separately.

## Entry families

### Confirmation breakout

After the five-hour delay, define the confirmation high from hourly candles available since signal detection. Enter only when a subsequent 1-hour candle closes above that fixed high. Use the confirming close plus modeled slippage as entry. This is the primary recommended family.

### Support retest

Wait for price to revisit within 1.5% above or 0.5% below the Bulls2 support. Enter only after an hourly bullish candle closes in the upper 35% of its range while still closing above support. Use that close plus modeled slippage.

### Immediate support limit

Place a virtual limit at 0.5% and 1.0% above support after the five-hour delay. Fill when a later hourly candle trades through the level. This family is a benchmark for the cost of entering without confirmation, not the default recommendation.

## Stops and exits

Test three initial stop families:

- 0.5% below Bulls2 support.
- 0.5% below the signal sweep low.
- One daily ATR below entry.

Reject a trade before entry when the stop is not below entry or the initial risk is non-positive. Test these exits:

- Full exit at 1.5R, 2R, or 3R.
- Half exit at 1R, move the remaining stop to breakeven, and exit the remainder at 2R.
- Time exit at 7 or 14 days when neither stop nor target has closed the trade.

When stop and target are both touched in the same hourly candle, apply the conservative rule: the stop occurs first. Include round-trip fees and entry/exit slippage in every result.

## Controlled search space

Evaluate only the explicitly defined entry, stop, target, and time-exit combinations. Do not add new thresholds after seeing holdout results. Score thresholds may be 0, 60, 70, and 80. Contextual filters are limited to relative volume 1.0-4.0 and entry distance no more than 3% above support, because those fields already have complete evidence.

## Validation protocol

Sort signals chronologically and split each signal type into development 60%, validation 20%, and final holdout 20%.

1. Generate all configurations on development data.
2. Retain configurations with at least 100 development trades, positive expectancy after costs, profit factor at least 1.15, and non-negative median R.
3. Select one configuration per signal type using development expectancy, profit factor, drawdown, and sample retention.
4. Evaluate that frozen configuration once on validation. Continue only when validation has at least 30 trades, positive expectancy, profit factor at least 1.15, and acceptable loss control.
5. Freeze the surviving configuration and evaluate it once on final holdout.

The final promotion gate requires at least 30 holdout trades, positive net expectancy, profit factor at least 1.20, median R above zero, and a drawdown and losing-streak profile explicitly reported. Performance must also exceed the original five-hour market-entry Bulls2 baseline.

## Metrics and outputs

Report trade count, fill rate, win rate, average and median net R, expectancy, profit factor, total compounded R, maximum drawdown in R, maximum consecutive losses, average holding time, stop/target/time-exit distribution, and results by calendar year and signal type.

Store the full configuration grid for development, the selected validation candidate, the untouched holdout result, and a trade ledger with signal, entry, stop, exit, fees, slippage, and realized R. The report conclusion is either `PROMOTE EXECUTION RULE` or `NO ROBUST EXECUTION EDGE`.

## Product boundary

Do not change 1D Bulls2 or create Bulls3 during this research. A product implementation is a later decision and requires a holdout-passing execution rule. Publish the research package to the BT repository after verification.
