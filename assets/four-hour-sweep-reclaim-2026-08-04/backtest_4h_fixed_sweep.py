"""Fixed #20, #21, and #29 sweep-reclaim test on Binance 4-hour OHLCV."""
from __future__ import annotations

import csv
import json
import time
import urllib.parse
import urllib.request
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from btc_support_backtest import Config, calculate_metrics, load_ohlcv, prepare_features, write_outputs
from optimize_btc_eth import HOLDOUT_START
from research_support_variants import run_variant


SYMBOLS = ("BTCUSDT", "ETHUSDT", "PEPEUSDT", "XRPUSDT", "SOLUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT")
ROOT = Path("outputs/four_hour_sweep_reclaim_2026-08-04")
DATA = ROOT / "data"
BASE = "https://api.binance.com/api/v3/klines"
START = datetime(2023, 12, 1, tzinfo=timezone.utc)
CONFIGS = {
    21: Config(lookback=60, support_tolerance=0.0075, min_body_ratio=0.30, close_top_fraction=0.30, trend_sma=0, stop_buffer=0.005, reward_risk=3.0),
    20: Config(lookback=60, support_tolerance=0.0075, min_body_ratio=0.30, close_top_fraction=0.30, trend_sma=0, stop_buffer=0.001, reward_risk=3.0),
    29: Config(lookback=60, support_tolerance=0.0075, min_body_ratio=0.50, close_top_fraction=0.30, trend_sma=0, stop_buffer=0.005, reward_risk=3.0),
}


def download_4h(symbol: str) -> Path:
    DATA.mkdir(parents=True, exist_ok=True)
    path = DATA / f"{symbol}_4h_binance.csv"
    if path.exists():
        return path
    start = int(START.timestamp() * 1000)
    rows = []
    while True:
        query = urllib.parse.urlencode({"symbol": symbol, "interval": "4h", "startTime": start, "limit": 1000})
        with urllib.request.urlopen(f"{BASE}?{query}", timeout=30) as response:
            batch = json.load(response)
        if not batch:
            break
        rows.extend(batch)
        start = batch[-1][0] + 14_400_000
        if len(batch) < 1000:
            break
        time.sleep(0.15)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["timestamp", "open", "high", "low", "close", "volume"])
        for item in rows:
            writer.writerow([datetime.fromtimestamp(item[0] / 1000, tz=timezone.utc).isoformat(), item[1], item[2], item[3], item[4], item[5]])
    return path


def metric_row(symbol: str, config_id: int, trades: pd.DataFrame) -> dict:
    metrics = calculate_metrics(trades)
    return {"symbol": symbol, "timeframe": "4h", "split": "holdout_2024_plus", "variant": "sweep_reclaim", "config_id": config_id, "trades": metrics["trades"], "win_rate": metrics["win_rate"], "expectancy_r": metrics["expectancy_r"], "profit_factor": metrics["profit_factor"], "max_drawdown_r": metrics["max_drawdown_r"], "total_r": float(trades.r_multiple.sum()) if not trades.empty else 0.0}


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    rows = []
    for symbol in SYMBOLS:
        raw = load_ohlcv(download_4h(symbol))
        raw = raw.loc[raw.timestamp + pd.Timedelta(hours=4) <= pd.Timestamp.now(tz="UTC")].reset_index(drop=True)
        # These fixed configurations have no SMA trend filter; 31 days is more than
        # enough history for the 60-bar (10-day) support lookback and swing confirmation.
        raw = raw.loc[raw.timestamp >= HOLDOUT_START - pd.Timedelta(days=31)].reset_index(drop=True)
        frame = prepare_features(raw)
        for config_id, config in CONFIGS.items():
            trades = run_variant(frame, config, "sweep_reclaim")
            trades = trades.loc[pd.to_datetime(trades.entry_time, utc=True) >= HOLDOUT_START].reset_index(drop=True)
            rows.append(metric_row(symbol, config_id, trades))
            output = ROOT / f"sweep_reclaim_{config_id}" / symbol
            output.mkdir(parents=True, exist_ok=True)
            trades.to_csv(output / "trades.csv", index=False)
    metrics = pd.DataFrame(rows).sort_values(["config_id", "symbol"])
    metrics.to_csv(ROOT / "holdout_metrics.csv", index=False)
    pd.DataFrame([{"config_id": config_id, **asdict(config)} for config_id, config in CONFIGS.items()]).to_csv(ROOT / "config_grid.csv", index=False)
    summary = ["# 4-hour fixed sweep-reclaim configurations", "", "- Fixed #20, #21, #29 from the daily BTC/ETH study; no 4-hour or asset-specific re-optimization.", "- 4-hour bars, 60-bar support age, confirmed 3-left/3-right swing lows, next 4-hour open entry, one position, 0.03% adverse slippage per side, 0.10% round-trip commission, 3R target.", "- Holdout: 2024-01-01 UTC onward. The still-forming 4-hour candle is excluded.", "", "## Holdout results", "```csv", metrics.to_csv(index=False).strip(), "```"]
    (ROOT / "SUMMARY.md").write_text("\n".join(summary) + "\n", encoding="utf-8")
    print(ROOT.resolve())


if __name__ == "__main__":
    main()
