"""Fixed out-of-sample sweep-reclaim test for SOL, XRP, LINK, ADA, and AVAX."""
from __future__ import annotations

from dataclasses import asdict
from pathlib import Path

import pandas as pd

from btc_support_backtest import Config, calculate_metrics, load_ohlcv, prepare_features, write_outputs
from optimize_btc_eth import HOLDOUT_START, download_daily
from research_support_variants import run_variant


SYMBOLS = ("SOLUSDT", "XRPUSDT", "LINKUSDT", "ADAUSDT", "AVAXUSDT")
ROOT = Path("outputs/alt_sweep_reclaim_2026-08-04")
CONFIGS = {
    21: Config(lookback=60, support_tolerance=0.0075, min_body_ratio=0.30, close_top_fraction=0.30, trend_sma=0, stop_buffer=0.005, reward_risk=3.0),
    20: Config(lookback=60, support_tolerance=0.0075, min_body_ratio=0.30, close_top_fraction=0.30, trend_sma=0, stop_buffer=0.001, reward_risk=3.0),
    29: Config(lookback=60, support_tolerance=0.0075, min_body_ratio=0.50, close_top_fraction=0.30, trend_sma=0, stop_buffer=0.005, reward_risk=3.0),
}


def row(symbol: str, config_id: int, trades: pd.DataFrame) -> dict:
    metrics = calculate_metrics(trades)
    return {"symbol": symbol, "split": "holdout_2024_plus", "variant": "sweep_reclaim", "config_id": config_id, "trades": metrics["trades"], "win_rate": metrics["win_rate"], "expectancy_r": metrics["expectancy_r"], "profit_factor": metrics["profit_factor"], "max_drawdown_r": metrics["max_drawdown_r"], "total_r": float(trades.r_multiple.sum()) if not trades.empty else 0.0}


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    rows = []
    for symbol in SYMBOLS:
        raw = load_ohlcv(download_daily(symbol))
        raw = raw.loc[raw.timestamp.dt.normalize() < pd.Timestamp.now(tz="UTC").normalize()].reset_index(drop=True)
        frame = prepare_features(raw.loc[raw.timestamp >= HOLDOUT_START - pd.Timedelta(days=250)].reset_index(drop=True))
        for config_id, config in CONFIGS.items():
            trades = run_variant(frame, config, "sweep_reclaim")
            trades = trades.loc[pd.to_datetime(trades.entry_time, utc=True) >= HOLDOUT_START].reset_index(drop=True)
            rows.append(row(symbol, config_id, trades))
            write_outputs(trades, ROOT / f"sweep_reclaim_{config_id}" / symbol)
    metrics = pd.DataFrame(rows).sort_values(["config_id", "symbol"])
    metrics.to_csv(ROOT / "holdout_metrics.csv", index=False)
    pd.DataFrame([{"config_id": config_id, **asdict(config)} for config_id, config in CONFIGS.items()]).to_csv(ROOT / "config_grid.csv", index=False)
    summary = ["# Fixed sweep-reclaim configurations across liquid altcoins", "", "- Fixed #21, #20, #29 from the BTC/ETH study; no asset-specific re-optimization.", "- Daily data, 2024-01-01 UTC onward, 250-day feature/support warmup, next-open entries, one position, 0.03% side slippage, 0.10% round-trip commission.", "", "## Holdout results", "```csv", metrics.to_csv(index=False).strip(), "```"]
    (ROOT / "SUMMARY.md").write_text("\n".join(summary) + "\n", encoding="utf-8")
    print(ROOT.resolve())


if __name__ == "__main__":
    main()
