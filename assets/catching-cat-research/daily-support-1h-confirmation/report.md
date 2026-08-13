NO WALK-FORWARD EDGE

# Daily-Support 1H Confirmation Study

- Research candidates: 5557
- Configurations: 16
- Walk-forward passed: false
- Frozen configuration: none
- Holdout: sealed

The first fold is training-only and five subsequent folds are out-of-sample. Holdout 1H data remain sealed until walk-forward and final frozen-selection gates pass. Full modeled friction is 0.20%.

Artifact schemas: array evidence files preserve deterministic row order; walk-forward-folds.json stores stable event/timestamp fold descriptors, selected configuration IDs with per-configuration metrics/fold summaries, and metric-only OOS evaluations. Full attempts, ranks, confirmations, and trades remain in their dedicated artifacts.
