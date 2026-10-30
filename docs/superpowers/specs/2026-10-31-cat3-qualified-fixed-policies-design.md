# Cat3 Qualified Fixed Policies Design

## Intent

Publish only the twelve Cat3 fixed-policy diagnostics that satisfied the frozen full-period point-estimate gate. The dashboard must make their post-hoc diagnostic status explicit and must not package failed or negative test results.

## Included policies

The report includes exactly these twelve policies:

- B-hold48-shortlist / B-hold48-filterfirst
- B-fixed5-shortlist / B-fixed5-filterfirst
- B-atr2-shortlist / B-atr2-filterfirst
- B-atr3-shortlist / B-atr3-filterfirst
- B-structure-shortlist / B-structure-filterfirst
- B-stalled-shortlist / B-stalled-filterfirst

## User-visible behaviour

- A new Cat3 dashboard report lists all twelve policies with trades, net return, maximum drawdown, mean trade return, win rate, profit factor, and average exposure.
- Selecting a policy opens its exact B-filter, exit, execution-ranking order, friction, and diagnostic-status rules.
- The report exposes a concise bilingual summary and exactly the twelve selected trade ledgers. It does not expose source logs, failed candidates, or the all-results ledger.
- The report describes the results as post-hoc full-period diagnostics and not as deployable or out-of-sample-selected strategies.

## Constraints

- Modelled friction remains 0.20% round trip; funding and live market impact remain excluded.
- The existing Cat3 walk-forward report and other dashboard reports remain unchanged.
- The release verifier must assert the twelve report rows, their evidence paths, and representative frozen metric values.
