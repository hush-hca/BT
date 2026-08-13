NO VALIDATED REFINED EDGE

# 4H Daily-Support Volume-Lock Study

## Conclusion

The preregistered secondary validation failed. The frozen subset produced 122 validation signals. After the exact 0.20% modeled cost, its 24-hour mean return was -0.2454%, median return was +0.0732%, and win rate was exactly 50.00%. The deterministic stationary-bootstrap 95% interval was [-1.1772%, +0.7149%]. Mean return, win rate above 50%, bootstrap lower bound, minimum 30 matched controls, and minimum 25% match rate all failed.

The validation matcher found only 6 controls, a 4.92% match rate. Their mean paired uplift was +5.2227%, but the preregistered minimum control coverage was not met, so this small matched subset is not accepted as evidence. The raw gate stopped the study before structural execution. No configuration was selected, no trades or profit-lock events were generated, and the holdout remained sealed.

## Frozen subset and recorded stages

- Broad descriptors reused without modification: 6,948.
- Frozen filter: `RelVol >= 2.0`, `poolTests >= 4`, and `bodyRatio >= 0.50`; score was not used.
- Refined descriptors: 634 unique events: 385 development, 122 validation, and 127 sealed holdout.
- Development 24H result: mean +0.5074%, median +0.1081%, win rate 51.69%; bootstrap interval [+0.0245%, +0.9873%]. These development results are descriptive only.
- Validation 24H result: mean -0.2454%, median +0.0732%, win rate 50.00%; bootstrap interval [-1.1772%, +0.7149%].
- Bootstrap: 10,000 deterministic stationary-block samples, block length 5, seed 20260812.
- Near-miss candidates: 235 accepted; 14,882 explicitly rejected during causal reconstruction.
- Matches: 14 development and 6 validation, with no control reused across stages.
- Execution configurations evaluated: 0 of 12, as required after raw-gate failure.
- Selected configuration: none. Validation/holdout execution metrics: null. Trades: 0. Profit-lock audit events: 0. Holdout: sealed.

## Integrity audit

- Every refined event is an unchanged member of the prior broad descriptor set and retains its recorded development, validation, or holdout stage.
- All refined rows satisfy the three immutable binary thresholds, and all 634 event IDs are unique.
- Every accepted near-miss has valid causal support and pool pivots preceding its candle, satisfies the same volume/body/pool filters, and records at least one failed sweep/reclaim requirement.
- Every match uses the same symbol and calendar quarter, a strictly earlier control candle, and a range/ATR difference no greater than 20%. No control ID is reused.
- All raw signal and control outcomes enter at the next 4H open and charge exactly 0.002 total modeled friction. The bootstrap inputs are the validation 24H net returns.
- Sealed holdout descriptors contain no entry, return, MFE, MAE, outcome, or attempt fields. Raw outcome artifacts contain development and validation only.
- The 8,623 unavailable symbol-month archives were recorded and not imputed. Existing official Binance Vision cache data were used; the frozen command was run once with no threshold variants or retuning.

Funding, market impact, order-book depth, and partial fills are not modeled. The positive development result and positive uplift among six matched controls do not establish a validated or tradable edge.
