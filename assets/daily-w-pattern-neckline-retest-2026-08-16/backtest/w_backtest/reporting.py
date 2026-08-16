"""CSV, chart, and Markdown reporting for the W-pattern analysis."""

from __future__ import annotations

import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


def _save_figure(fig: plt.Figure, path: Path) -> None:
    fig.tight_layout()
    fig.savefig(path, dpi=170, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def write_charts(
    equity: pd.DataFrame,
    baseline: pd.DataFrame,
    sensitivity: pd.DataFrame,
    output_dir: Path,
) -> dict[str, Path]:
    """Render the four charts solely from the tables exported to CSV."""
    output_dir = Path(output_dir)
    plt.style.use("seaborn-v0_8-whitegrid")

    fig, ax = plt.subplots(figsize=(10, 5.2))
    if equity.empty:
        ax.text(0.5, 0.5, "No closed-equity events", ha="center", va="center")
    else:
        ax.plot(pd.to_datetime(equity["date"]), equity["equity"], color="#1768AC", lw=1.8)
    ax.set(title="Combined Portfolio — Closed Equity", xlabel="Date (UTC)", ylabel="Equity (USDT)")
    ax.ticklabel_format(style="plain", axis="y")
    equity_path = output_dir / "equity_curve.png"
    _save_figure(fig, equity_path)

    fig, ax = plt.subplots(figsize=(10, 4.8))
    if equity.empty:
        ax.text(0.5, 0.5, "No closed-equity events", ha="center", va="center")
    else:
        values = pd.to_numeric(equity["equity"])
        peaks = pd.concat([pd.Series([100_000.0]), values], ignore_index=True).cummax().iloc[1:].to_numpy()
        drawdown = (values.to_numpy() / peaks - 1.0) * 100
        dates = pd.to_datetime(equity["date"])
        ax.fill_between(dates, drawdown, 0, color="#C44536", alpha=0.7)
    ax.set(title="Combined Portfolio — Closed-Equity Drawdown", xlabel="Date (UTC)", ylabel="Drawdown (%)")
    drawdown_path = output_dir / "drawdown.png"
    _save_figure(fig, drawdown_path)

    assets = baseline.loc[baseline["scope"] != "COMBINED"].copy()
    fig, ax = plt.subplots(figsize=(9, 4.8))
    if assets.empty:
        ax.text(0.5, 0.5, "No asset results", ha="center", va="center")
    else:
        colors = np.where(assets["net_r"] >= 0, "#2A9D8F", "#C44536")
        ax.bar(assets["scope"], assets["net_r"], color=colors)
        ax.axhline(0, color="#333333", lw=0.8)
    ax.set(title="Baseline Net R by Asset (Independent Simulations)", xlabel="Asset", ylabel="Total net R")
    asset_path = output_dir / "per_asset_net_r.png"
    _save_figure(fig, asset_path)

    fig, ax = plt.subplots(figsize=(10, 5.2))
    if sensitivity.empty:
        ax.text(0.5, 0.5, "No sensitivity results", ha="center", va="center")
    else:
        ordered = sensitivity.sort_values(["trough_similarity", "support_tolerance", "retest_tolerance"]).reset_index(drop=True)
        x = np.arange(1, len(ordered) + 1)
        points = ax.scatter(x, ordered["mean_net_r"], c=ordered["trades"], cmap="viridis", s=55)
        colorbar = fig.colorbar(points, ax=ax, pad=0.02)
        colorbar.set_label("Trade count")
        baseline_mask = (
            np.isclose(ordered["trough_similarity"], 0.03)
            & np.isclose(ordered["support_tolerance"], 0.02)
            & np.isclose(ordered["retest_tolerance"], 0.01)
        )
        if baseline_mask.any():
            bx = x[np.asarray(baseline_mask)][0]
            by = ordered.loc[baseline_mask, "mean_net_r"].iloc[0]
            ax.scatter([bx], [by], marker="*", s=180, color="#E76F51", edgecolor="black", label="Baseline")
            ax.legend(loc="best")
        ax.axhline(0, color="#333333", lw=0.8)
        ax.set_xticks([1, 5, 9, 14, 18, 23, 27])
        ax.set_xlim(0, 28)
    ax.set(title="Sensitivity Grid — Net Expectancy", xlabel="Parameter combination (sorted)", ylabel="Mean net R per trade")
    sensitivity_path = output_dir / "sensitivity_robustness.png"
    _save_figure(fig, sensitivity_path)
    return {
        "equity_chart": equity_path,
        "drawdown_chart": drawdown_path,
        "asset_chart": asset_path,
        "sensitivity_chart": sensitivity_path,
    }


def _fmt(value, digits=2) -> str:
    if pd.isna(value):
        return "n/a"
    if math.isinf(float(value)):
        return "∞"
    return f"{float(value):,.{digits}f}"


def write_report(
    path: Path,
    baseline: pd.DataFrame,
    sensitivity: pd.DataFrame,
    end_date: str,
) -> None:
    """Write a concise narrative whose figures come from exported tables."""
    combined = baseline.loc[baseline["scope"] == "COMBINED"].iloc[0]
    assets = baseline.loc[baseline["scope"] != "COMBINED"]
    rows = []
    for row in assets.itertuples(index=False):
        rows.append(
            f"| {row.scope} | {row.start_date} | {row.end_date} | {int(row.bars)} | "
            f"{int(row.w_candidates)} | {int(row.confirmed_breakouts)} | {int(row.valid_retests)} | "
            f"{int(row.trades)} | {_fmt(100*row.win_rate, 1)}% | {_fmt(row.net_r)} | "
            f"{_fmt(row.profit_factor)} | {_fmt(row.return_pct*100)}% |"
        )
    trade_min, trade_med, trade_max = sensitivity["trades"].min(), sensitivity["trades"].median(), sensitivity["trades"].max()
    exp_min, exp_med, exp_max = sensitivity["mean_net_r"].min(), sensitivity["mean_net_r"].median(), sensitivity["mean_net_r"].max()
    pf = sensitivity["profit_factor"].replace([np.inf, -np.inf], np.nan)
    r_min, r_med, r_max = sensitivity["net_r"].min(), sensitivity["net_r"].median(), sensitivity["net_r"].max()
    text = f"""# W-Pattern Neckline-Retest Backtest

## Result

Across BTC, ETH, SOL, PEPE, and DOGE, the shared baseline portfolio executed **{int(combined.trades)} trades**, produced **{_fmt(combined.net_r)} net R** and **{_fmt(combined.total_net_pnl)} USDT** net P&L, and finished at **{_fmt(combined.final_equity)} USDT** ({_fmt(combined.return_pct*100)}%). The net win rate was **{_fmt(combined.win_rate*100, 1)}%**, profit factor was **{_fmt(combined.profit_factor)}**, and maximum closed-equity drawdown was **{_fmt(combined.max_drawdown_pct*100)}%**. These are historical mechanical-test results, not a recommendation.

## Per-asset baseline

Each asset row is an independent 100,000-USDT simulation; the combined row uses one shared portfolio. Unequal observation periods are explicit.

| Scope | Start | End | Bars | W candidates | Breakouts | Valid retests | Trades | Win rate | Net R | Profit factor | Return |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
{chr(10).join(rows)}
| **COMBINED** | — | {end_date} | {int(combined.bars)} | {int(combined.w_candidates)} | {int(combined.confirmed_breakouts)} | {int(combined.valid_retests)} | **{int(combined.trades)}** | **{_fmt(combined.win_rate*100, 1)}%** | **{_fmt(combined.net_r)}** | **{_fmt(combined.profit_factor)}** | **{_fmt(combined.return_pct*100)}%** |

Combined exits: {int(combined.wins)} profitable, {int(combined.losses)} losing, {int(combined.breakeven_exits)} breakeven-stop, {int(combined.time_exits)} timed, and {int(combined.end_of_data_exits)} end-of-data. Mean/median net result was {_fmt(combined.mean_net_r)}/{_fmt(combined.median_net_r)} R; mean/median holding time was {_fmt(combined.mean_holding_bars,1)}/{_fmt(combined.median_holding_bars,1)} daily bars. Maximum concurrent modeled risk was {_fmt(combined.max_concurrent_risk_pct*100)}% of equity.

## Rules and execution model

- Binance spot 1-day UTC OHLCV through {end_date}; each symbol starts at its first retained complete daily candle.
- A pivot uses three candles on each side and is known only after the third right candle closes.
- The two troughs are 5–60 bars apart and within 3%; both sit within 2% of a support zone established by at least two earlier confirmed pivot lows.
- The neckline is the highest intervening high. A close above it must occur within 60 bars, followed within 30 bars by a candle intersecting the ±1% neckline band and closing at or above the neckline.
- Entry is the following daily open. The initial stop is 1% below the lower trough; target is 2R. Touching 1R moves the stop to entry starting on the next candle.
- An already-active stop wins ambiguous same-candle paths. Trades time out after 60 managed bars at the following open; remaining positions exit at the final close.
- Costs are 10 bps on entry and exit. Each entry risks 1% of current equity, with at most one open trade per symbol; exits precede entries on the same date.
- Profit factor is positive net P&L divided by the absolute value of negative net P&L. It is infinity when gains exist with no losses, and NaN when neither gains nor losses exist.

## Sensitivity

All 27 combinations of trough similarity (2%, 3%, 5%), support tolerance (1%, 2%, 3%), and retest tolerance (0.5%, 1%, 2%) were run on the same sample. Trade counts ranged **{int(trade_min)}–{int(trade_max)}** (median {_fmt(trade_med,1)}), mean net R ranged **{_fmt(exp_min)}–{_fmt(exp_max)}** (median {_fmt(exp_med)}), finite profit factors ranged **{_fmt(pf.min())}–{_fmt(pf.max())}** (median {_fmt(pf.median())}), and total net R ranged **{_fmt(r_min)}–{_fmt(r_max)}** (median {_fmt(r_med)}). This grid is diagnostic and is not out-of-sample optimization.

## Limitations

- W-pattern and support rules are mechanical approximations of discretionary chart reading.
- Daily OHLC bars hide intraday paths; conservative threshold ordering is assumed rather than observed.
- Binance listing dates create unequal histories, especially for PEPE.
- Spot-only selection excludes delisted assets and introduces survivorship/selection bias.
- Fees and fills are simplified. Market impact, changing spreads, taxes, funding, and borrow costs are excluded.
- The sensitivity grid reuses the same sample and does not establish out-of-sample validity or statistical significance.
- Historical performance is not a guarantee and is not financial advice.

## Reproduction and files

Prerequisites are Python 3.11 or newer, internet access to Binance's public spot API for an uncached run, and the pinned packages in `requirements.txt`. From this packaged study directory, create a virtual environment with `python -m venv .venv`, then activate it with `. .venv/bin/activate` on macOS/Linux or `.\\.venv\\Scripts\\Activate.ps1` in Windows PowerShell. Then run:

```text
python -m pip install -r requirements.txt
python backtest/run_backtest.py
```

On some Windows installations the Python launcher command is `py` instead of `python`. The run downloads or validates cached source candles, so it is not a zero-setup/offline reproduction. The CSVs are the numeric source for this report and its charts: `trades.csv`, `baseline_summary.csv`, `sensitivity_summary.csv`, and `equity_curve.csv`.
"""
    Path(path).write_text(text, encoding="utf-8")
