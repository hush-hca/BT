"""End-to-end orchestration for the W-pattern retest backtest."""

from __future__ import annotations

from dataclasses import asdict, replace
from itertools import product
import json
from pathlib import Path

import numpy as np
import pandas as pd

from .config import SYMBOLS, StrategyConfig
from .data import fetch_all_history
from .engine import simulate_portfolio
from .metrics import summarize
from .patterns import detect_signals
from .reporting import write_charts, write_report


def load_frames(data_dir: str | Path, end_date: str) -> dict[str, pd.DataFrame]:
    return {symbol: fetch_all_history(symbol, end_date, data_dir) for symbol in SYMBOLS}


def _run(frames: dict[str, pd.DataFrame], cfg: StrategyConfig):
    signals, funnels = {}, {}
    for symbol, frame in frames.items():
        signals[symbol], funnels[symbol] = detect_signals(frame, cfg)
    trades, equity = simulate_portfolio(frames, signals, cfg)
    return signals, funnels, trades, equity


def _summary_row(scope, metrics, frame=None, funnel=None):
    funnel = funnel or {}
    return {
        "scope": scope,
        "start_date": frame["date"].min().date().isoformat() if frame is not None and not frame.empty else "",
        "end_date": frame["date"].max().date().isoformat() if frame is not None and not frame.empty else "",
        "bars": int(len(frame)) if frame is not None else 0,
        "w_candidates": int(funnel.get("w_candidates", 0)),
        "confirmed_breakouts": int(funnel.get("confirmed_breakouts", 0)),
        "valid_retests": int(funnel.get("valid_retests", 0)),
        **metrics,
    }


def _baseline_summary(frames, signals, funnels, trades, equity, cfg):
    rows = []
    for symbol in SYMBOLS:
        asset_trades, asset_equity = simulate_portfolio({symbol: frames[symbol]}, {symbol: signals[symbol]}, cfg)
        rows.append(_summary_row(symbol, summarize(asset_trades, asset_equity, cfg.initial_equity), frames[symbol], funnels[symbol]))
    combined_funnel = {key: sum(int(funnel.get(key, 0)) for funnel in funnels.values()) for key in ("w_candidates", "confirmed_breakouts", "valid_retests")}
    combined = _summary_row("COMBINED", summarize(trades, equity, cfg.initial_equity), None, combined_funnel)
    combined["start_date"] = min(frame["date"].min() for frame in frames.values()).date().isoformat()
    combined["end_date"] = max(frame["date"].max() for frame in frames.values()).date().isoformat()
    combined["bars"] = sum(len(frame) for frame in frames.values())
    rows.append(combined)
    return pd.DataFrame(rows)


def run_analysis(output_dir: str | Path, data_dir: str | Path, end_date: str) -> dict[str, Path]:
    output_dir, data_dir = Path(output_dir), Path(data_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)
    cfg = StrategyConfig()
    frames = load_frames(data_dir, end_date)
    signals, funnels, trades, equity = _run(frames, cfg)
    baseline = _baseline_summary(frames, signals, funnels, trades, equity, cfg)

    sensitivity_rows = []
    for trough, support, retest in product((.02, .03, .05), (.01, .02, .03), (.005, .01, .02)):
        variant = replace(cfg, trough_similarity=trough, support_tolerance=support, retest_tolerance=retest)
        _, _, variant_trades, variant_equity = _run(frames, variant)
        metrics = summarize(variant_trades, variant_equity, cfg.initial_equity)
        sensitivity_rows.append({
            "trough_similarity": trough,
            "support_tolerance": support,
            "retest_tolerance": retest,
            "trades": metrics["trades"], "mean_net_r": metrics["mean_net_r"],
            "profit_factor": metrics["profit_factor"], "net_r": metrics["net_r"],
            "total_net_pnl": metrics["total_net_pnl"], "return_pct": metrics["return_pct"],
        })
    sensitivity = pd.DataFrame(sensitivity_rows)

    paths = {
        "report": output_dir / "w_pattern_retest_report.md",
        "trades": output_dir / "trades.csv",
        "baseline_summary": output_dir / "baseline_summary.csv",
        "sensitivity_summary": output_dir / "sensitivity_summary.csv",
        "equity_curve_csv": output_dir / "equity_curve.csv",
        "equity_chart": output_dir / "equity_curve.png",
        "drawdown_chart": output_dir / "drawdown.png",
        "asset_chart": output_dir / "per_asset_net_r.png",
        "sensitivity_chart": output_dir / "sensitivity_robustness.png",
        "config": output_dir / "config.json",
    }
    trades.to_csv(paths["trades"], index=False, date_format="%Y-%m-%d")
    baseline.to_csv(paths["baseline_summary"], index=False)
    sensitivity.to_csv(paths["sensitivity_summary"], index=False)
    equity.to_csv(paths["equity_curve_csv"], index=False, date_format="%Y-%m-%d")
    paths["config"].write_text(json.dumps({"end_date": end_date, "symbols": list(SYMBOLS), "strategy": asdict(cfg)}, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    # Reload exported tables so charts and narrative use precisely the serialized values.
    baseline_disk = pd.read_csv(paths["baseline_summary"])
    sensitivity_disk = pd.read_csv(paths["sensitivity_summary"])
    equity_disk = pd.read_csv(paths["equity_curve_csv"])
    write_charts(equity_disk, baseline_disk, sensitivity_disk, output_dir)
    write_report(paths["report"], baseline_disk, sensitivity_disk, end_date)
    return paths
