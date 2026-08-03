"""Finish the BTC/ETH holdout phase from the completed development grid."""
import json
from pathlib import Path

import pandas as pd

from btc_support_backtest import Config, load_ohlcv, prepare_features, run_backtest_fast, write_outputs
from optimize_btc_eth import HOLDOUT_START, ROOT, calculate_metrics, load_telegram_config, metrics_row, notify


def main():
    dev = pd.read_csv(ROOT / "development_metrics_all.csv")
    grid = pd.read_csv(ROOT / "config_grid.csv")
    pivot = dev.pivot(index="config_id", columns="symbol", values=["trades", "expectancy_r", "profit_factor"])
    eligible = []
    for cid in pivot.index:
        rows = [{k: pivot.loc[cid, (k, s)] for k in ("trades", "expectancy_r", "profit_factor")} for s in ("BTCUSDT", "ETHUSDT")]
        if all(x["trades"] >= 25 and x["expectancy_r"] > 0 and x["profit_factor"] > 1 for x in rows):
            eligible.append((cid, min(x["expectancy_r"] for x in rows)))
    candidates = [int(cid) for cid, _ in sorted(eligible, key=lambda x: x[1], reverse=True)[:20]]
    telegram = load_telegram_config(); notify(telegram, f"Development grid complete: {len(eligible)} eligible rules. Testing top {len(candidates)} on holdout.")
    frames = {s: prepare_features(load_ohlcv(ROOT / "data" / f"{s}_1d_binance.csv").loc[lambda x: x.timestamp >= HOLDOUT_START - pd.Timedelta(days=250)].reset_index(drop=True)) for s in ("BTCUSDT", "ETHUSDT")}
    rows, winners = [], []
    for cid in candidates:
        values = grid.loc[grid.config_id == cid].drop(columns="config_id").iloc[0].to_dict()
        for field in ("lookback", "swing_side", "trend_sma"):
            values[field] = int(values[field])
        cfg = Config(**values)
        result = []
        for symbol, frame in frames.items():
            trades = run_backtest_fast(frame, cfg); trades = trades.loc[pd.to_datetime(trades.entry_time, utc=True) >= HOLDOUT_START].reset_index(drop=True)
            result.append(metrics_row(symbol, "holdout", cid, trades)); write_outputs(trades, ROOT / f"candidate_{cid}" / symbol)
        rows.extend(result); table = pd.DataFrame(result)
        if ((table.trades >= 15) & (table.win_rate >= .60) & (table.expectancy_r > 0) & (table.profit_factor > 1)).all(): winners.append(cid)
    pd.DataFrame(rows).to_csv(ROOT / "holdout_metrics_top20.csv", index=False)
    report = ["# BTC/ETH 3R support-bounce optimization", "", f"Development-eligible rules: {len(eligible)}", f"Holdout candidates tested: {len(candidates)}", ""]
    report += [f"## Qualifying configuration: {winners[0]}" if winners else "## Result: no qualifying combination found"]
    (ROOT / "SUMMARY.md").write_text("\n".join(report), encoding="utf-8")
    notify(telegram, report[-1] + ". Reports saved in outputs/btc_eth_support_3r.")

if __name__ == "__main__": main()
