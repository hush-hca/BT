"""Performance summaries for W-pattern backtest ledgers."""

from __future__ import annotations

import math

import numpy as np
import pandas as pd


def summarize(
    trades: pd.DataFrame, equity_curve: pd.DataFrame, initial_equity: float
) -> dict[str, float | int]:
    """Return documented trade and closed-equity performance statistics."""
    trade_count = int(len(trades))
    pnl = pd.to_numeric(trades.get("net_pnl", pd.Series(dtype=float)), errors="coerce")
    net_r = pd.to_numeric(trades.get("net_r", pd.Series(dtype=float)), errors="coerce")
    gross_r = pd.to_numeric(trades.get("gross_r", pd.Series(dtype=float)), errors="coerce")
    holding = pd.to_numeric(
        trades.get("holding_bars", pd.Series(dtype=float)), errors="coerce"
    )
    reasons = trades.get("exit_reason", pd.Series(dtype=object))

    positive = float(pnl[pnl > 0].sum())
    negative = float(-pnl[pnl < 0].sum())
    if negative > 0:
        profit_factor = positive / negative
    elif positive > 0:
        profit_factor = math.inf
    else:
        profit_factor = math.nan

    if equity_curve.empty or "equity" not in equity_curve:
        max_drawdown = 0.0
        final_equity = float(initial_equity + pnl.sum())
    else:
        equity = pd.to_numeric(equity_curve["equity"], errors="coerce").dropna()
        if equity.empty:
            max_drawdown = 0.0
            final_equity = float(initial_equity + pnl.sum())
        else:
            # Include starting capital as the first high-water mark even when
            # the supplied curve begins after a losing trade.
            path = pd.concat([pd.Series([float(initial_equity)]), equity], ignore_index=True)
            peaks = path.cummax()
            drawdown = (peaks - path) / peaks.replace(0, np.nan)
            max_drawdown = float(drawdown.max())
            final_equity = float(equity.iloc[-1])

    total_net_pnl = float(pnl.sum())
    concurrent = pd.to_numeric(
        trades.get("concurrent_open_risk", pd.Series(dtype=float)), errors="coerce"
    )
    concurrent_pct = pd.to_numeric(
        trades.get("concurrent_open_risk_pct", pd.Series(dtype=float)), errors="coerce"
    )

    return {
        "trades": trade_count,
        "wins": int((pnl > 0).sum()),
        "losses": int((pnl < 0).sum()),
        "breakeven_exits": int((reasons == "breakeven").sum()),
        "time_exits": int((reasons == "time").sum()),
        "end_of_data_exits": int((reasons == "end_of_data").sum()),
        "win_rate": float((pnl > 0).sum() / trade_count) if trade_count else math.nan,
        "gross_r": float(gross_r.sum()),
        "net_r": float(net_r.sum()),
        "mean_net_r": float(net_r.mean()) if trade_count else math.nan,
        "median_net_r": float(net_r.median()) if trade_count else math.nan,
        "profit_factor": profit_factor,
        "total_net_pnl": total_net_pnl,
        "return_pct": total_net_pnl / initial_equity if initial_equity else math.nan,
        "final_equity": final_equity,
        "max_drawdown_pct": max_drawdown,
        "max_concurrent_risk": float(concurrent.max()) if not concurrent.empty else 0.0,
        "max_concurrent_risk_pct": (
            float(concurrent_pct.max()) if not concurrent_pct.empty else 0.0
        ),
        "mean_holding_bars": float(holding.mean()) if trade_count else math.nan,
        "median_holding_bars": float(holding.median()) if trade_count else math.nan,
    }
