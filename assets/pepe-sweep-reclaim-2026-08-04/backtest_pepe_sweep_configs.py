"""Fixed, out-of-sample PEPEUSDT test for pre-selected sweep-reclaim configs 21, 20, and 29."""
from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

import pandas as pd

from btc_support_backtest import Config, calculate_metrics, load_ohlcv, prepare_features, write_outputs
from optimize_btc_eth import HOLDOUT_START, download_daily, load_telegram_config, notify
from research_support_variants import run_variant


SYMBOL = "PEPEUSDT"
ROOT = Path("outputs/pepe_sweep_reclaim_2026-08-04")
CONFIGS = {
    21: Config(lookback=60, support_tolerance=0.0075, min_body_ratio=0.30, close_top_fraction=0.30, trend_sma=0, stop_buffer=0.005, reward_risk=3.0),
    20: Config(lookback=60, support_tolerance=0.0075, min_body_ratio=0.30, close_top_fraction=0.30, trend_sma=0, stop_buffer=0.001, reward_risk=3.0),
    29: Config(lookback=60, support_tolerance=0.0075, min_body_ratio=0.50, close_top_fraction=0.30, trend_sma=0, stop_buffer=0.005, reward_risk=3.0),
}


def metric_row(config_id: int, trades: pd.DataFrame) -> dict:
    metrics = calculate_metrics(trades)
    return {
        "symbol": SYMBOL,
        "split": "holdout_2024_plus",
        "variant": "sweep_reclaim",
        "config_id": config_id,
        "trades": metrics["trades"],
        "win_rate": metrics["win_rate"],
        "expectancy_r": metrics["expectancy_r"],
        "profit_factor": metrics["profit_factor"],
        "max_drawdown_r": metrics["max_drawdown_r"],
        "total_r": float(trades.r_multiple.sum()) if not trades.empty else 0.0,
    }


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    telegram = load_telegram_config()
    notify(telegram, "PEPEUSDT fixed sweep-reclaim test started: configs #21, #20, #29. No re-optimization; 2024+ holdout only.")
    source = download_daily(SYMBOL)
    raw = load_ohlcv(source)
    # Exclude today's still-forming daily candle; all prior signals can only enter on their next open.
    raw = raw.loc[raw.timestamp.dt.normalize() < pd.Timestamp.now(tz="UTC").normalize()].reset_index(drop=True)
    frame = prepare_features(raw.loc[raw.timestamp >= HOLDOUT_START - pd.Timedelta(days=250)].reset_index(drop=True))
    rows = []
    for config_id, config in CONFIGS.items():
        notify(telegram, f"PEPEUSDT testing sweep-reclaim #{config_id}.")
        trades = run_variant(frame, config, "sweep_reclaim")
        trades = trades.loc[pd.to_datetime(trades.entry_time, utc=True) >= HOLDOUT_START].reset_index(drop=True)
        rows.append(metric_row(config_id, trades))
        write_outputs(trades, ROOT / f"sweep_reclaim_{config_id}" / SYMBOL)
    metrics = pd.DataFrame(rows).sort_values("config_id")
    metrics.to_csv(ROOT / "holdout_metrics.csv", index=False)
    config_grid = pd.DataFrame([{"config_id": config_id, **asdict(config)} for config_id, config in CONFIGS.items()])
    config_grid.to_csv(ROOT / "config_grid.csv", index=False)
    summary = [
        "# PEPEUSDT fixed sweep-reclaim configurations",
        "",
        "## Method",
        "- Fixed configurations #21, #20, #29; no parameters were selected using PEPE data.",
        "- Signal: confirmed daily support swing-low, sweep below support, then close back above it with bullish strong-close rules.",
        "- Entry: next daily open. One position at a time. 0.03% adverse slippage per side and 0.10% round-trip commission.",
        "- Evaluation: 2024-01-01 UTC onward; indicators and support levels receive 250 days of prior warmup data.",
        "- Limitation: PEPE has materially shorter market history than BTC/ETH, so this is not a comparable multi-cycle validation.",
        "",
        "## Holdout results",
        "```csv",
        metrics.to_csv(index=False).strip(),
        "```",
    ]
    (ROOT / "SUMMARY.md").write_text("\n".join(summary) + "\n", encoding="utf-8")
    notify(telegram, "PEPEUSDT fixed sweep-reclaim test complete. Results and charts were saved for dashboard publication.")
    print(ROOT.resolve())


if __name__ == "__main__":
    main()
