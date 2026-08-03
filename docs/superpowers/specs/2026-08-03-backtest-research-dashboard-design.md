# Backtest Research Dashboard Design

## Goal

Create a static, responsive dashboard for comparing multiple backtesting strategies. The first populated strategy is the BTC/ETH daily support-bounce bullish-candle strategy; future strategies use the same data contract and appear without redesigning the interface.

## Information architecture

- **Overview:** research status, global test-universe note, strategy count, and a clear warning that results are not investment advice.
- **Strategy cards:** each strategy exposes name, markets, timeframe, target R multiple, validation status, holdout summary, and a link to its detail view.
- **Strategy detail:** rule checklist, data split, execution/cost assumptions, objective/pass criteria, BTC/ETH comparison, near-miss configurations, and limitations.
- **Result charts:** per-strategy cumulative-R equity curves for BTC and ETH, trade R-multiple distributions, and a near-miss candidate chart comparing BTC/ETH holdout win rates against the 60% target.
- **Reusable data layer:** a local `data/strategies.json` manifest lists strategies. Each strategy references a result payload with summary metrics, configurations, and optional chart assets. New strategies require data addition, not UI restructuring.

## First strategy content

- Name: Daily Support Bounce — Bullish Candle.
- Markets: Binance spot BTCUSDT and ETHUSDT daily OHLC, available listing date through 2026-08-02 UTC.
- Objective: both assets must pass the untouched 2024+ holdout with at least 15 trades, 60% win rate, positive expectancy, PF > 1, and 3R target after the stated costs.
- Result: no qualifying common rule; show the 34 development-eligible and 20 holdout-tested counts and the closest ten configurations.
- Rule parameters and the entries/exits/cost assumptions are displayed exactly as backtested.
- The dashboard embeds the generated BTC and ETH equity/R-distribution reports for each displayed candidate and adds an interactive SVG-free CSS/chart comparison built from the holdout metrics.

## UI direction

- Dark research-terminal aesthetic with clear typographic hierarchy, high-contrast metric cards, compact tables, and an amber caution treatment for unverified conclusions.
- Responsive layout: comparison table scrolls horizontally on small screens; cards collapse to a single column.
- No accounts, uploads, database, or live trading controls. Data is static research evidence.

## Validation

- Build succeeds with the repository's site tooling.
- Dashboard renders with supplied real results and contains no secrets.
- Strategy manifest can be extended with a second strategy payload without editing the primary layout component.
