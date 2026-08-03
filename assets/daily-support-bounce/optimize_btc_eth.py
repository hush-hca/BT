"""Search a pre-registered 3R BTC/ETH daily support-bounce strategy grid."""
from __future__ import annotations

import csv
import itertools
import json
import os
import time
import urllib.parse
import urllib.request
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor

import pandas as pd

from btc_support_backtest import Config, calculate_metrics, load_ohlcv, prepare_features, run_backtest_fast, write_outputs

ROOT = Path("outputs/btc_eth_support_3r")
DATA = ROOT / "data"
DEVELOPMENT_END = pd.Timestamp("2023-12-31 23:59:59", tz="UTC")
HOLDOUT_START = pd.Timestamp("2024-01-01", tz="UTC")
BASE = "https://api.binance.com/api/v3/klines"
_DEVELOPMENT: dict[str, pd.DataFrame] | None = None
_CONFIGS: list[Config] | None = None


def load_telegram_config() -> tuple[str, str] | None:
    """Use process variables first, then an untracked local telegram.env file."""
    env_file = Path("telegram.env")
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                key, value = line.split("=", 1)
                if key.strip() in {"TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"}:
                    os.environ.setdefault(key.strip(), value.strip())
    token, chat_id = os.getenv("TELEGRAM_BOT_TOKEN"), os.getenv("TELEGRAM_CHAT_ID")
    return (token, chat_id) if token and chat_id else None


def notify(telegram: tuple[str, str] | None, message: str) -> None:
    if telegram is None:
        return
    token, chat_id = telegram
    try:
        payload = urllib.parse.urlencode({"chat_id": chat_id, "text": message}) .encode()
        urllib.request.urlopen(urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=payload), timeout=15).read()
    except Exception as error:
        print(f"Telegram notification failed: {type(error).__name__}")


def _init_worker(development: dict[str, pd.DataFrame], configs: list[Config]) -> None:
    global _DEVELOPMENT, _CONFIGS
    _DEVELOPMENT = development
    _CONFIGS = configs


def _evaluate_development(config_id: int) -> list[dict]:
    """Evaluate one configuration in a worker with prebuilt features."""
    assert _DEVELOPMENT is not None and _CONFIGS is not None
    config = _CONFIGS[config_id]
    return [metrics_row(symbol, "development", config_id, run_backtest_fast(_DEVELOPMENT[symbol], config)) for symbol in ("BTCUSDT", "ETHUSDT")]


def download_daily(symbol: str) -> Path:
    DATA.mkdir(parents=True, exist_ok=True)
    output = DATA / f"{symbol}_1d_binance.csv"
    start = int(datetime(2017, 8, 1, tzinfo=timezone.utc).timestamp() * 1000)
    rows = []
    while True:
        query = urllib.parse.urlencode({"symbol": symbol, "interval": "1d", "startTime": start, "limit": 1000})
        with urllib.request.urlopen(f"{BASE}?{query}", timeout=30) as response:
            batch = json.load(response)
        if not batch:
            break
        rows.extend(batch)
        start = batch[-1][0] + 86_400_000
        if len(batch) < 1000:
            break
        time.sleep(.15)
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle); writer.writerow(["timestamp", "open", "high", "low", "close", "volume"])
        for item in rows:
            writer.writerow([datetime.fromtimestamp(item[0] / 1000, tz=timezone.utc).isoformat(), item[1], item[2], item[3], item[4], item[5]])
    return output


def metrics_row(symbol: str, split: str, config_id: int, trades: pd.DataFrame) -> dict:
    m = calculate_metrics(trades)
    return {"symbol": symbol, "split": split, "config_id": config_id, "trades": m["trades"], "win_rate": m["win_rate"], "expectancy_r": m["expectancy_r"], "profit_factor": m["profit_factor"], "max_drawdown_r": m["max_drawdown_r"]}


def grid() -> list[Config]:
    return [
        Config(lookback=age, support_tolerance=tolerance, close_top_fraction=top, min_body_ratio=body,
               trend_sma=sma, volume_multiplier=volume, stop_buffer=stop, reward_risk=3.0)
        for age, tolerance, top, body, sma, volume, stop in itertools.product(
            (10, 20, 40, 60), (.0015, .003, .005, .0075), (.20, .30, .40), (.30, .50, .70),
            (0, 100, 200), (0, 1.0, 1.25, 1.5), (.001, .0025, .005)
        )
    ]


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    telegram = load_telegram_config()
    if telegram is None:
        print("Telegram disabled: set process variables or create local telegram.env.")
    else:
        notify(telegram, "BTC/ETH 3R support-bounce search started. Development period through 2023; holdout begins 2024.")
    paths = {symbol: download_daily(symbol) for symbol in ("BTCUSDT", "ETHUSDT")}
    all_frames = {symbol: load_ohlcv(path) for symbol, path in paths.items()}
    development = {symbol: prepare_features(frame.loc[frame.timestamp <= DEVELOPMENT_END].reset_index(drop=True)) for symbol, frame in all_frames.items()}
    # Include 250 pre-holdout days for indicator/support warmup but discard trades entered before holdout.
    holdout = {symbol: prepare_features(frame.loc[frame.timestamp >= HOLDOUT_START - pd.Timedelta(days=250)].reset_index(drop=True)) for symbol, frame in all_frames.items()}
    configs = grid()
    config_rows = [{"config_id": config_id, **asdict(config)} for config_id, config in enumerate(configs)]
    dev_rows = []
    workers = min(4, os.cpu_count() or 1)
    with ProcessPoolExecutor(max_workers=workers, initializer=_init_worker, initargs=(development, configs)) as pool:
        for config_id, rows in enumerate(pool.map(_evaluate_development, range(len(configs)), chunksize=24)):
            dev_rows.extend(rows)
            if config_id % 500 == 0:
                print(f"Searched {config_id}/{len(configs)} configurations with {workers} workers")
                progress = {"completed": config_id + 1, "total": len(configs), "percent": round((config_id + 1) / len(configs) * 100, 1)}
                (ROOT / "progress.json").write_text(json.dumps(progress), encoding="utf-8")
                notify(telegram, f"Backtest progress: {progress['completed']}/{progress['total']} ({progress['percent']}%).")
    pd.DataFrame(config_rows).to_csv(ROOT / "config_grid.csv", index=False)
    development_metrics = pd.DataFrame(dev_rows)
    development_metrics.to_csv(ROOT / "development_metrics_all.csv", index=False)
    pivot = development_metrics.pivot(index="config_id", columns="symbol", values=["trades", "expectancy_r", "profit_factor"])
    eligible = []
    for config_id in pivot.index:
        btc, eth = {symbol: {field: pivot.loc[config_id, (field, symbol)] for field in ("trades", "expectancy_r", "profit_factor")} for symbol in ("BTCUSDT", "ETHUSDT")}
        if all(x["trades"] >= 25 and x["expectancy_r"] > 0 and x["profit_factor"] > 1 for x in (btc, eth)):
            eligible.append((config_id, min(btc["expectancy_r"], eth["expectancy_r"])))
    candidates = [config_id for config_id, _ in sorted(eligible, key=lambda x: x[1], reverse=True)[:20]]
    pd.DataFrame({"config_id": candidates}).merge(pd.DataFrame(config_rows), on="config_id", how="left").to_csv(ROOT / "development_top20.csv", index=False)
    holdout_rows, selected = [], []
    for config_id in candidates:
        config = configs[config_id]
        rows = []
        for symbol in ("BTCUSDT", "ETHUSDT"):
            trades = run_backtest_fast(holdout[symbol], config)
            trades = trades.loc[pd.to_datetime(trades["entry_time"], utc=True) >= HOLDOUT_START].reset_index(drop=True)
            rows.append(metrics_row(symbol, "holdout", config_id, trades))
            write_outputs(trades, ROOT / f"candidate_{config_id}" / symbol)
        holdout_rows.extend(rows)
        both = pd.DataFrame(rows)
        if ((both.trades >= 15) & (both.win_rate >= .60) & (both.expectancy_r > 0) & (both.profit_factor > 1)).all():
            selected.append(config_id)
    holdout_metrics = pd.DataFrame(holdout_rows)
    holdout_metrics.to_csv(ROOT / "holdout_metrics_top20.csv", index=False)
    report = ["# BTC/ETH 3R support-bounce optimization", "", "## Fixed methodology", "- Development: through 2023-12-31 UTC; holdout: 2024-01-01 onward.", "- Costs: 0.03% adverse slippage per side and 0.10% round-trip commission.", "- Qualification: both BTCUSDT and ETHUSDT need >=15 holdout trades, >=60% win rate, positive expectancy, and PF > 1.", "", f"Configurations searched: {len(configs)}", f"Development-eligible configurations: {len(eligible)}", f"Holdout candidates evaluated: {len(candidates)}", ""]
    if selected:
        best = selected[0]
        report += [f"## Qualifying configuration: {best}", "", "```json", json.dumps(asdict(configs[best]), indent=2), "```"]
    else:
        report += ["## Result: no qualifying combination found", "", "No pre-registered parameter combination met every BTC and ETH holdout threshold. This is a negative result, not a basis for relaxing or re-searching on the holdout."]
    (ROOT / "SUMMARY.md").write_text("\n".join(report), encoding="utf-8")
    notify(telegram, "BTC/ETH 3R support-bounce search completed. Check SUMMARY.md and holdout_metrics_top20.csv in the output folder.")
    print("Optimization complete:", ROOT.resolve())


if __name__ == "__main__":
    main()
