NO VALIDATED RAW EDGE

# 4H Daily-Support Liquidity Sweep Study

## Conclusion

The preregistered broad 4H signal did not demonstrate a validated 24-hour raw edge. The validation sample contained 1,399 signals. After the exact 0.20% modeled round-trip cost, mean return was +0.0723%, median return was -0.0150%, and win rate was 49.89%. The deterministic stationary-bootstrap 95% interval for mean return was [-0.5555%, +0.6870%]. The median, win-rate, and bootstrap-lower-bound gates failed, so the pipeline stopped before testing any of the 16 execution configurations. No strategy was selected, validation execution was not run, and the holdout remained sealed.

## Frozen design and counts

- Period: 2022-07-01 through 2026-06-30.
- Source: official Binance Vision monthly 1D and 4H futures candles.
- Point-in-time liquidity universe: top 150 by completed prior-day quote turnover.
- Discovered signals: 6,948 unique events; 257 otherwise-valid events were rejected outside the point-in-time top 150.
- Timestamp-group split: 4,158 development, 1,399 validation, and 1,391 sealed holdout descriptors. No timestamp group crosses a split boundary.
- Development 24H result: mean -0.0462%, median -0.2810%, win rate 45.53%; bootstrap interval [-0.3525%, +0.2663%].
- Validation 24H result: mean +0.0723%, median -0.0150%, win rate 49.89%; bootstrap interval [-0.5555%, +0.6870%].
- Bootstrap: 10,000 deterministic stationary-block samples, block length 5, seed 20260812.
- Stage B configurations evaluated: 0 of 16, as required after Stage A failure.
- Selected configuration: none. Trades: none. Holdout status: sealed.

## Integrity audit

- All 6,948 event IDs are unique. Every accepted event has `universeRank` between 1 and 150 and its symbol matches the corresponding recorded point-in-time universe position.
- Daily-support pivots and 4H liquidity-pool pivots precede their signal candle. Raw outcomes enter at the immediate next 4H open (`entryTime == detectedAt`) and use only later completed candles.
- Every evaluated development/validation raw row records the exact 0.002 modeled cost. Holdout descriptors contain no entry, return, MFE, MAE, attempt, or outcome fields; `raw-edge.json` contains only development and validation outcomes.
- The development/validation/holdout time ranges are strictly chronological: development ends 2025-06-08 20:00 UTC, validation begins 2025-06-09 12:00 UTC and ends 2025-12-15 00:00 UTC, and holdout begins 2025-12-15 04:00 UTC.
- Archive failures total 8,629: 8,623 unavailable symbol-month archives (mostly pre-listing) and six archive decode errors. They were recorded and never imputed. The six decode failures were LTC 1D 2025-11, VET 1D 2022-10, BICO 4H 2026-07, NEO 4H 2026-03 and 2026-04, and WLD 4H 2024-09.

## Matched-control limitation

The official runner produced zero matched controls because no control-candidate collection was supplied to the Stage A matcher. Consequently, paired uplift was unavailable and its preregistered gate also failed. This is a runner-integration limitation, not evidence that paired uplift is zero. It does not reverse the terminal decision: the validation median, win rate, and bootstrap lower bound independently failed their frozen thresholds. No parameter was retuned and no alternate run was performed.

Funding, market impact, order-book depth, and partial fills are not modeled. Attractive individual signals or development-period behavior do not establish profitability.
