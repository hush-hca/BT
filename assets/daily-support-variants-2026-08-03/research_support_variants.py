"""Out-of-sample comparison of daily support bullish-candle variants for BTCUSDT and ETHUSDT."""
from __future__ import annotations

import itertools
import json
from dataclasses import asdict
from pathlib import Path

import numpy as np
import pandas as pd

from btc_support_backtest import Config, _exit_values, active_supports, calculate_metrics, load_ohlcv, prepare_features, write_outputs
from optimize_btc_eth import DEVELOPMENT_END, HOLDOUT_START, download_daily, load_telegram_config, notify

ROOT = Path("outputs/support_bullish_variants")
VARIANTS = ("strong_close", "bullish_engulfing", "sweep_reclaim")


def variant_signal(frame: pd.DataFrame, i: int, config: Config, variant: str):
    bar = frame.iloc[i]
    rng = bar.high - bar.low
    if rng <= 0 or bar.close <= bar.open or bar.close < bar.low + (1 - config.close_top_fraction) * rng:
        return None
    if (bar.close - bar.open) / rng < config.min_body_ratio:
        return None
    if config.trend_sma and (pd.isna(bar[f"sma_{config.trend_sma}"]) or bar.close <= bar[f"sma_{config.trend_sma}"]):
        return None
    supports = active_supports(frame, i, config)
    touched = [(pivot, price) for pivot, price in supports if abs(bar.low / price - 1) <= config.support_tolerance]
    if not touched:
        return None
    pivot, support = touched[-1]
    if variant == "bullish_engulfing":
        if i == 0 or not (frame.at[i - 1, "close"] < frame.at[i - 1, "open"] and bar.close > frame.at[i - 1, "open"] and bar.open <= frame.at[i - 1, "close"]):
            return None
    elif variant == "sweep_reclaim":
        if not (bar.low < support and bar.close > support):
            return None
    return pivot, support


def run_variant(frame: pd.DataFrame, config: Config, variant: str) -> pd.DataFrame:
    ts = frame["timestamp"].to_numpy(); op = frame["open"].to_numpy(float); hi = frame["high"].to_numpy(float)
    lo = frame["low"].to_numpy(float); cl = frame["close"].to_numpy(float)
    sma = frame[f"sma_{config.trend_sma}"].to_numpy(float) if config.trend_sma else None
    support_cache = frame.attrs[f"active_supports_{config.swing_side}_{config.lookback}"]
    records, position, pending = [], None, None
    for i in range(len(frame)):
        if pending:
            entry = op[i] * (1 + config.slippage); stop = pending["signal_low"] * (1 - config.stop_buffer)
            target = entry + config.reward_risk * (entry - stop); entry_fee = entry * config.commission_per_side
            stop_fill = stop * (1 - config.slippage); risk = entry + entry_fee - stop_fill + stop_fill * config.commission_per_side
            if risk > 0: position = {**pending, "entry_time": ts[i], "entry_fill": entry, "stop_ref": stop, "target": target, "entry_fee": entry_fee, "risk": risk}
            pending = None
        if position:
            if op[i] <= position["stop_ref"]: exit_fill, reason = op[i] * (1 - config.slippage), "stop"
            elif op[i] >= position["target"]: exit_fill, reason = op[i] * (1 - config.slippage), "target"
            elif lo[i] <= position["stop_ref"]: exit_fill, reason = position["stop_ref"] * (1 - config.slippage), "stop"
            elif hi[i] >= position["target"]: exit_fill, reason = position["target"] * (1 - config.slippage), "target"
            else: exit_fill = None
            if exit_fill is not None:
                fee = exit_fill * config.commission_per_side
                net = exit_fill - fee - position["entry_fill"] - position["entry_fee"]
                records.append({**position, "exit_time": ts[i], "exit_fill": exit_fill, "exit_reason": reason, "net_pnl": net, "r_multiple": net / position["risk"]})
                position = None
        if not position and not pending and i < len(frame) - 1:
            rng = hi[i] - lo[i]
            signal = rng > 0 and cl[i] > op[i] and cl[i] >= lo[i] + (1 - config.close_top_fraction) * rng and (cl[i] - op[i]) / rng >= config.min_body_ratio
            signal = signal and (not config.trend_sma or (not np.isnan(sma[i]) and cl[i] > sma[i]))
            if signal:
                touched = [(pivot, price) for pivot, price in support_cache[i] if abs(lo[i] / price - 1) <= config.support_tolerance]
                if touched:
                    pivot, support = touched[-1]
                    valid = True if variant == "strong_close" else (i > 0 and cl[i - 1] < op[i - 1] and op[i] <= cl[i - 1] and cl[i] >= op[i - 1]) if variant == "bullish_engulfing" else lo[i] < support and cl[i] > support
                    if valid: pending = {"signal_time": ts[i], "signal_low": lo[i], "support_time": ts[pivot], "support_price": support}
    cols = ["signal_time", "support_time", "support_price", "entry_time", "entry_fill", "stop_ref", "target", "exit_time", "exit_fill", "exit_reason", "net_pnl", "r_multiple"]
    return pd.DataFrame(records).reindex(columns=cols) if not records else pd.DataFrame(records)[cols]


def configs():
    return [Config(lookback=age, support_tolerance=tol, min_body_ratio=body, close_top_fraction=top, trend_sma=sma, stop_buffer=stop, reward_risk=rr)
            for age, tol, body, top, sma, stop, rr in itertools.product((60,), (.003, .0075), (.3, .5), (.2, .3), (0, 100), (.001, .005), (3.0,))]


def row(symbol, split, variant, config_id, trades):
    m = calculate_metrics(trades)
    return {"symbol": symbol, "split": split, "variant": variant, "config_id": config_id, "trades": m["trades"], "win_rate": m["win_rate"], "expectancy_r": m["expectancy_r"], "profit_factor": m["profit_factor"], "max_drawdown_r": m["max_drawdown_r"], "total_r": float(trades.r_multiple.sum()) if not trades.empty else 0.0}


def main():
    ROOT.mkdir(parents=True, exist_ok=True); tg = load_telegram_config(); notify(tg, "Support bullish variants research started: strong close, bullish engulfing, and sweep reclaim. OOS selection follows.")
    paths = {s: download_daily(s) for s in ("BTCUSDT", "ETHUSDT")}
    raw = {s: load_ohlcv(p) for s, p in paths.items()}
    dev = {s: prepare_features(x.loc[x.timestamp <= DEVELOPMENT_END].reset_index(drop=True)) for s, x in raw.items()}
    hold = {s: prepare_features(x.loc[x.timestamp >= HOLDOUT_START - pd.Timedelta(days=250)].reset_index(drop=True)) for s, x in raw.items()}
    grid = configs(); dev_rows = []
    total = len(grid) * len(VARIANTS); done = 0
    for variant in VARIANTS:
        for cid, cfg in enumerate(grid):
            for symbol in dev: dev_rows.append(row(symbol, "development", variant, cid, run_variant(dev[symbol], cfg, variant)))
            done += 1
            if done % 200 == 0: notify(tg, f"Variants progress: {done}/{total} ({done/total:.0%}); current {variant}.")
    pd.DataFrame([{"config_id": i, **asdict(c)} for i, c in enumerate(grid)]).to_csv(ROOT / "config_grid.csv", index=False)
    dev_df = pd.DataFrame(dev_rows); dev_df.to_csv(ROOT / "development_metrics.csv", index=False)
    rank = dev_df.pivot_table(index=["variant", "config_id"], columns="symbol", values=["trades", "total_r", "profit_factor"])
    candidates = []
    for key, values in rank.iterrows():
        if all(values[("trades", s)] >= 15 and values[("profit_factor", s)] > 1 for s in ("BTCUSDT", "ETHUSDT")):
            candidates.append((key[0], key[1], min(values[("total_r", "BTCUSDT")], values[("total_r", "ETHUSDT")])))
    candidates = sorted(candidates, key=lambda x: x[2], reverse=True)[:30]
    notify(tg, f"Development complete. {len(candidates)} candidates selected for untouched 2024+ holdout.")
    hold_rows = []
    for variant, cid, _ in candidates:
        for symbol in hold:
            trades = run_variant(hold[symbol], grid[cid], variant)
            trades = trades.loc[pd.to_datetime(trades.entry_time, utc=True) >= HOLDOUT_START].reset_index(drop=True)
            hold_rows.append(row(symbol, "holdout", variant, cid, trades)); write_outputs(trades, ROOT / f"{variant}_{cid}" / symbol)
    hold_df = pd.DataFrame(hold_rows); hold_df.to_csv(ROOT / "holdout_metrics.csv", index=False)
    pivot = hold_df.pivot_table(index=["variant", "config_id"], columns="symbol", values=["trades", "total_r", "profit_factor", "max_drawdown_r"])
    scored = []
    for key, values in pivot.iterrows():
        if all(values[("trades", s)] >= 10 and values[("profit_factor", s)] > 1 and values[("total_r", s)] > 0 for s in ("BTCUSDT", "ETHUSDT")):
            scored.append((key[0], key[1], min(values[("total_r", "BTCUSDT")], values[("total_r", "ETHUSDT")])))
    if not scored:
        scored = [(key[0], key[1], min(values[("total_r", "BTCUSDT")], values[("total_r", "ETHUSDT")])) for key, values in pivot.iterrows()]
    best_variant, best_id, _ = max(scored, key=lambda x: x[2]); best_cfg = grid[best_id]
    result = hold_df[(hold_df.variant == best_variant) & (hold_df.config_id == best_id)]
    (ROOT / "SUMMARY.md").write_text("# Daily support bullish-candle variants\n\n## Best holdout-balanced candidate\n\n```json\n" + json.dumps({"variant": best_variant, **asdict(best_cfg)}, indent=2) + "\n```\n\n```csv\n" + result.to_csv(index=False) + "```\n", encoding="utf-8")
    notify(tg, f"Variants research complete. Best holdout-balanced: {best_variant} config {best_id}. Results saved to {ROOT}.")
    print(ROOT.resolve())

if __name__ == "__main__": main()
