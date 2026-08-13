NO VALIDATED STRATEGY

# 1D Bulls5 Selective Trend Study

- Selected configuration: none
- Holdout: sealed
- Grid configurations: 54
- Candidates: 2272
- Data failures: 4800

## Decisive result

The study discovered 2,657 raw Bulls4 events. Point-in-time universe reconstruction retained 2,272 unique candidates and rejected 385 events outside the causal top-150 universe. The 1.0 daily-RelVol configurations selected 334 development candidates; the 1.5 and 2.0 thresholds selected 148 and 63 respectively.

Trend confirmation was the dominant bottleneck. Representative 1.0-RelVol configurations recorded 298 to 304 `trend-failed-before-breakout` cancellations among their 334 attempts. No configuration produced more than two filled development trades. Therefore none approached the frozen minimum of 100 development trades, no configuration was development-eligible, validation was not run, and the holdout remained sealed. This is insufficient evidence for expected profitability and parameters were not retuned.

The 4,800 data failures are HTTP 404 responses for unavailable official Binance daily symbol-month archives, predominantly months before the affected contracts had listing history. They were cached and reported as unavailable, never filled, estimated, or replaced with live/demo data. Intraday archive loading was restricted to candidate symbols and reported no separate archive failures in this run.

## Integrity audit

- Unique retained event IDs: 2,272 of 2,272; duplicates: 0.
- Retained candidates outside their causal top-150 membership: 0.
- Timestamp stages: 1,363 development, 456 validation descriptors, and 453 sealed holdout descriptors.
- Grid: exactly 54 unique predefined configuration IDs.
- Selected configuration: none; validation metrics: absent; holdout outcomes opened: no.
- Holdout descriptors containing `attempt` or `outcome`: 0.
- Maximum filled trades in any development configuration: 2.
- Observed maximum per-position initial risk: 1.0 normalized equity unit.
- Observed maximum aggregate open initial risk: 1.0, below the 5.0 cap.
- Observed maximum position and aggregate open notional: 15.704, below the 25.0 and 100.0 caps.
- `trades.json` has 30 rows because the same sparse fills recur across different frozen development configurations; it is not 30 trades from one selected strategy.

## Development

- Trades: 0
- Total return: 0
- MDD: 0
- Win rate: 0
- Profit Factor: 0
- Mean / median net return: 0 / 0
- Average / median holding hours: 0 / 0
- Modeled costs: 0
- Fold expectancy: []
- Yearly: {}

## Validation

- Trades: 0
- Total return: 0
- MDD: 0
- Win rate: 0
- Profit Factor: 0
- Mean / median net return: 0 / 0
- Average / median holding hours: 0 / 0
- Modeled costs: 0
- Fold expectancy: []
- Yearly: {}

## Holdout

- Trades: 0
- Total return: 0
- MDD: 0
- Win rate: 0
- Profit Factor: 0
- Mean / median net return: 0 / 0
- Average / median holding hours: 0 / 0
- Modeled costs: 0
- Fold expectancy: []
- Yearly: {}

## Immediate Bulls4 baseline

- Same selected timestamp population: 0 trades
- Mean net return: 0

The baseline remains empty because the protocol defines its comparison population from the single development-selected configuration, and no configuration passed development eligibility. It was not used to hide or replace failed strategy results.

Official Binance Vision monthly USD-M candles only. Archive gaps are rejected, never imputed. The historical symbol seed is limited by Binance archive scope. Development results select hypotheses and are not validated profitability. No demo, synthetic, estimated, current REST, BTC filter, trailing stop, or fixed-R:R targets are used.
