"""Daily BTCUSDT support-bounce backtest with no swing-low look-ahead."""
from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import matplotlib
import numpy as np
import pandas as pd

# The CLI only writes PNG reports; a GUI backend would fail on headless systems.
matplotlib.use("Agg")
import matplotlib.pyplot as plt


@dataclass(frozen=True)
class Config:
    lookback: int = 60
    swing_side: int = 3
    support_tolerance: float = 0.003
    stop_buffer: float = 0.001
    reward_risk: float = 2.8
    slippage: float = 0.0003
    commission_per_side: float = 0.0005
    min_body_ratio: float = 0.0
    close_top_fraction: float = 0.30
    trend_sma: int = 0
    volume_multiplier: float = 0.0


def load_ohlcv(path: str | Path) -> pd.DataFrame:
    """Load, validate, normalize, and sort daily OHLC CSV data."""
    frame = pd.read_csv(path)
    frame.columns = [str(c).strip().lower() for c in frame.columns]
    required = {"timestamp", "open", "high", "low", "close"}
    missing = required.difference(frame.columns)
    if missing:
        raise ValueError(f"CSV is missing required columns: {', '.join(sorted(missing))}")
    raw_time = frame["timestamp"]
    if pd.api.types.is_numeric_dtype(raw_time):
        magnitude = raw_time.dropna().abs().median()
        unit = "ms" if magnitude > 10_000_000_000 else "s"
        frame["timestamp"] = pd.to_datetime(raw_time, unit=unit, utc=True)
    else:
        frame["timestamp"] = pd.to_datetime(raw_time, utc=True, errors="coerce")
    for column in ("open", "high", "low", "close"):
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    frame = frame.dropna(subset=["timestamp", "open", "high", "low", "close"])
    frame = frame.sort_values("timestamp").drop_duplicates("timestamp", keep="last").reset_index(drop=True)
    if frame.empty:
        raise ValueError("CSV has no valid OHLC rows.")
    invalid = (
        (frame[["open", "high", "low", "close"]] <= 0).any(axis=1)
        | (frame["high"] < frame[["open", "low", "close"]].max(axis=1))
        | (frame["low"] > frame[["open", "high", "close"]].min(axis=1))
    )
    if invalid.any():
        raise ValueError("OHLC data contains non-positive or internally inconsistent bars.")
    return frame[[c for c in ["timestamp", "open", "high", "low", "close", "volume"] if c in frame.columns]]


def is_confirmed_swing_low(frame: pd.DataFrame, pivot: int, side: int) -> bool:
    if pivot < side or pivot + side >= len(frame):
        return False
    low = frame.at[pivot, "low"]
    left = frame.loc[pivot - side : pivot - 1, "low"]
    right = frame.loc[pivot + 1 : pivot + side, "low"]
    return bool((low < left).all() and (low < right).all())


def active_supports(frame: pd.DataFrame, decision_index: int, config: Config) -> list[tuple[int, float]]:
    """Return only supports whose required right-side bars already closed."""
    active_cache = frame.attrs.get(f"active_supports_{config.swing_side}_{config.lookback}")
    if active_cache is not None:
        return active_cache[decision_index]
    latest_pivot = decision_index - config.swing_side
    earliest_pivot = max(config.swing_side, decision_index - config.lookback)
    cache = frame.attrs.get(f"confirmed_supports_{config.swing_side}")
    if cache is not None:
        return [(pivot, price) for pivot, price in cache[decision_index] if pivot >= earliest_pivot]
    return [
        (pivot, float(frame.at[pivot, "low"]))
        for pivot in range(earliest_pivot, latest_pivot + 1)
        if is_confirmed_swing_low(frame, pivot, config.swing_side)
    ]


def prepare_features(frame: pd.DataFrame, swing_side: int = 3) -> pd.DataFrame:
    """Precompute only decision-time indicators and confirmed support history."""
    prepared = frame.copy()
    for window in (100, 200):
        prepared[f"sma_{window}"] = prepared["close"].rolling(window).mean()
    prepared["volume_ma20"] = prepared["volume"].rolling(20).mean().shift(1) if "volume" in prepared.columns else np.nan
    history: list[tuple[int, float]] = []
    cache: list[list[tuple[int, float]]] = []
    for decision in range(len(prepared)):
        pivot = decision - swing_side
        if is_confirmed_swing_low(prepared, pivot, swing_side):
            history.append((pivot, float(prepared.at[pivot, "low"])))
        cache.append(history.copy())
    prepared.attrs[f"confirmed_supports_{swing_side}"] = cache
    for lookback in (10, 20, 40, 60):
        prepared.attrs[f"active_supports_{swing_side}_{lookback}"] = [
            [(pivot, price) for pivot, price in supports if pivot >= max(swing_side, index - lookback)]
            for index, supports in enumerate(cache)
        ]
    return prepared


def run_backtest_fast(frame: pd.DataFrame, config: Config | None = None) -> pd.DataFrame:
    """Numpy-oriented equivalent of run_backtest for parameter-grid searches."""
    config = config or Config()
    if not {"sma_100", "sma_200", "volume_ma20"}.issubset(frame.columns):
        frame = prepare_features(frame, config.swing_side)
    ts = frame["timestamp"].to_numpy(); op = frame["open"].to_numpy(float); hi = frame["high"].to_numpy(float)
    lo = frame["low"].to_numpy(float); cl = frame["close"].to_numpy(float)
    volume = frame["volume"].to_numpy(float) if "volume" in frame else np.full(len(frame), np.nan)
    sma = frame[f"sma_{config.trend_sma}"].to_numpy(float) if config.trend_sma else None
    volume_ma = frame["volume_ma20"].to_numpy(float)
    cache = frame.attrs.get(f"active_supports_{config.swing_side}_{config.lookback}")
    if cache is None:
        cache = [active_supports(frame, i, config) for i in range(len(frame))]
    records, position, pending = [], None, None
    for i in range(len(frame)):
        if pending is not None:
            entry_fill = op[i] * (1 + config.slippage); stop_ref = pending["signal_low"] * (1 - config.stop_buffer)
            target = entry_fill + config.reward_risk * (entry_fill - stop_ref); entry_fee = entry_fill * config.commission_per_side
            planned_stop_fill = stop_ref * (1 - config.slippage); planned_stop_fee = planned_stop_fill * config.commission_per_side
            risk = entry_fill + entry_fee - planned_stop_fill + planned_stop_fee
            if risk > 0:
                position = {**pending, "entry_index": i, "entry_time": ts[i], "entry_fill": entry_fill, "stop_ref": stop_ref, "target": target, "entry_fee": entry_fee, "risk": risk}
            pending = None
        if position is not None:
            if op[i] <= position["stop_ref"]:
                exit_fill, reason = op[i] * (1 - config.slippage), "stop"
            elif op[i] >= position["target"]:
                exit_fill, reason = op[i] * (1 - config.slippage), "target"
            elif lo[i] <= position["stop_ref"]:
                exit_fill, reason = position["stop_ref"] * (1 - config.slippage), "stop"
            elif hi[i] >= position["target"]:
                exit_fill, reason = position["target"] * (1 - config.slippage), "target"
            else:
                exit_fill = None
            if exit_fill is not None:
                exit_fee = exit_fill * config.commission_per_side; net = exit_fill - exit_fee - position["entry_fill"] - position["entry_fee"]
                records.append({**position, "exit_index": i, "exit_time": ts[i], "exit_fill": exit_fill, "exit_fee": exit_fee, "exit_reason": reason, "net_pnl": net, "r_multiple": net / position["risk"]})
                position = None
        if position is None and pending is None and i < len(frame) - 1:
            candle_range = hi[i] - lo[i]
            allowed = candle_range > 0 and cl[i] > op[i] and cl[i] >= lo[i] + (1 - config.close_top_fraction) * candle_range and (cl[i] - op[i]) / candle_range >= config.min_body_ratio
            allowed = allowed and (not config.trend_sma or (not np.isnan(sma[i]) and cl[i] > sma[i]))
            allowed = allowed and (not config.volume_multiplier or (not np.isnan(volume_ma[i]) and volume[i] >= config.volume_multiplier * volume_ma[i]))
            if allowed:
                touched = [(pivot, price) for pivot, price in cache[i] if abs(lo[i] / price - 1) <= config.support_tolerance]
                if touched:
                    pivot, price = touched[-1]
                    pending = {"signal_index": i, "signal_time": ts[i], "signal_low": lo[i], "support_pivot_index": pivot, "support_time": ts[pivot], "support_price": price}
    if position is not None:
        exit_fill = cl[-1] * (1 - config.slippage); exit_fee = exit_fill * config.commission_per_side; net = exit_fill - exit_fee - position["entry_fill"] - position["entry_fee"]
        records.append({**position, "exit_index": len(frame)-1, "exit_time": ts[-1], "exit_fill": exit_fill, "exit_fee": exit_fee, "exit_reason": "end_of_data", "net_pnl": net, "r_multiple": net / position["risk"]})
    columns = ["signal_time", "support_time", "support_price", "entry_time", "entry_fill", "stop_ref", "target", "exit_time", "exit_fill", "exit_reason", "net_pnl", "r_multiple"]
    trades = pd.DataFrame(records)
    return trades.reindex(columns=columns) if trades.empty else trades[columns]


def signal_support(frame: pd.DataFrame, index: int, config: Config) -> tuple[int, float] | None:
    row = frame.iloc[index]
    candle_range = row.high - row.low
    if candle_range <= 0 or row.close <= row.open:
        return None
    # A close in the upper x% means close >= low + (1-x) of the range.
    if row.close < row.low + (1 - config.close_top_fraction) * candle_range:
        return None
    if (row.close - row.open) / candle_range < config.min_body_ratio:
        return None
    if config.trend_sma and (pd.isna(row[f"sma_{config.trend_sma}"]) or row.close <= row[f"sma_{config.trend_sma}"]):
        return None
    if config.volume_multiplier and (pd.isna(row["volume_ma20"]) or row.volume < config.volume_multiplier * row.volume_ma20):
        return None
    candidates = active_supports(frame, index, config)
    touched = [(pivot, price) for pivot, price in candidates if abs(row.low / price - 1) <= config.support_tolerance]
    return max(touched, key=lambda item: item[0]) if touched else None


def _exit_values(bar: pd.Series, entry_fill: float, stop_ref: float, target: float, config: Config) -> tuple[float, str] | None:
    """Return adverse-slippage exit fill. Stop wins ambiguous daily bars."""
    # The open is known to occur before the rest of the bar, so resolve gap exits first.
    if bar.open <= stop_ref:
        return float(bar.open) * (1 - config.slippage), "stop"
    if bar.open >= target:
        return float(bar.open) * (1 - config.slippage), "target"
    if bar.low <= stop_ref:
        return stop_ref * (1 - config.slippage), "stop"
    if bar.high >= target:
        return target * (1 - config.slippage), "target"
    return None


def run_backtest(frame: pd.DataFrame, config: Config | None = None) -> pd.DataFrame:
    config = config or Config()
    derived = {"sma_100", "sma_200", "volume_ma20"}
    if not derived.issubset(frame.columns):
        frame = prepare_features(frame, config.swing_side)
    records: list[dict[str, Any]] = []
    position: dict[str, Any] | None = None
    pending: dict[str, Any] | None = None
    for i in range(len(frame)):
        bar = frame.iloc[i]
        # A signal on i-1 can only fill at this bar's open.
        if pending is not None:
            entry_fill = float(bar.open) * (1 + config.slippage)
            stop_ref = pending["signal_low"] * (1 - config.stop_buffer)
            target = entry_fill + config.reward_risk * (entry_fill - stop_ref)
            entry_fee = entry_fill * config.commission_per_side
            planned_stop_fill = stop_ref * (1 - config.slippage)
            planned_stop_fee = planned_stop_fill * config.commission_per_side
            risk = entry_fill + entry_fee - planned_stop_fill + planned_stop_fee
            if risk > 0:
                position = {**pending, "entry_index": i, "entry_time": bar.timestamp, "entry_fill": entry_fill,
                            "stop_ref": stop_ref, "target": target, "entry_fee": entry_fee, "risk": risk}
            pending = None
        if position is not None:
            outcome = _exit_values(bar, position["entry_fill"], position["stop_ref"], position["target"], config)
            if outcome is not None:
                exit_fill, reason = outcome
                exit_fee = exit_fill * config.commission_per_side
                net = exit_fill - exit_fee - position["entry_fill"] - position["entry_fee"]
                records.append({**position, "exit_index": i, "exit_time": bar.timestamp, "exit_fill": exit_fill,
                                "exit_fee": exit_fee, "exit_reason": reason, "net_pnl": net, "r_multiple": net / position["risk"]})
                position = None
        if position is None and pending is None and i < len(frame) - 1:
            support = signal_support(frame, i, config)
            if support is not None:
                pivot, price = support
                pending = {"signal_index": i, "signal_time": bar.timestamp, "signal_low": float(bar.low),
                           "support_pivot_index": pivot, "support_time": frame.at[pivot, "timestamp"], "support_price": price}
    if position is not None:
        last = frame.iloc[-1]
        exit_fill = float(last.close) * (1 - config.slippage)
        exit_fee = exit_fill * config.commission_per_side
        net = exit_fill - exit_fee - position["entry_fill"] - position["entry_fee"]
        records.append({**position, "exit_index": len(frame) - 1, "exit_time": last.timestamp, "exit_fill": exit_fill,
                        "exit_fee": exit_fee, "exit_reason": "end_of_data", "net_pnl": net, "r_multiple": net / position["risk"]})
    columns = ["signal_time", "support_time", "support_price", "entry_time", "entry_fill", "stop_ref", "target", "exit_time", "exit_fill", "exit_reason", "net_pnl", "r_multiple"]
    trades = pd.DataFrame(records)
    return trades.reindex(columns=columns) if trades.empty else trades[columns]


def calculate_metrics(trades: pd.DataFrame) -> dict[str, Any]:
    if trades.empty:
        return {"trades": 0, "win_rate": np.nan, "mean_r": np.nan, "expectancy_r": np.nan, "profit_factor": np.nan, "max_drawdown_r": 0.0, "annual": pd.DataFrame()}
    r = trades["r_multiple"]
    gross_profit, gross_loss = r[r > 0].sum(), -r[r < 0].sum()
    equity = r.cumsum()
    drawdown = equity - equity.cummax()
    annual = trades.assign(year=pd.to_datetime(trades["exit_time"], utc=True).dt.year).groupby("year").agg(trades=("r_multiple", "size"), win_rate=("r_multiple", lambda s: (s > 0).mean()), total_r=("r_multiple", "sum"), mean_r=("r_multiple", "mean"))
    return {"trades": len(trades), "win_rate": (r > 0).mean(), "mean_r": r.mean(), "expectancy_r": r.mean(), "profit_factor": gross_profit / gross_loss if gross_loss else np.inf, "max_drawdown_r": drawdown.min(), "annual": annual}


def write_outputs(trades: pd.DataFrame, output_dir: str | Path) -> dict[str, Any]:
    out = Path(output_dir); out.mkdir(parents=True, exist_ok=True)
    trades.to_csv(out / "trades.csv", index=False)
    metrics = calculate_metrics(trades)
    lines = [f"{key}: {value:.4f}" if isinstance(value, (float, np.floating)) else f"{key}: {value}" for key, value in metrics.items() if key != "annual"]
    lines += ["", "Annual metrics:", metrics["annual"].to_string() if not metrics["annual"].empty else "No completed trades."]
    (out / "metrics.txt").write_text("\n".join(lines), encoding="utf-8")
    plt.figure(figsize=(10, 5)); plt.plot(trades["exit_time"], trades["r_multiple"].cumsum() if not trades.empty else []); plt.title("Equity curve (cumulative R)"); plt.xlabel("Exit date"); plt.ylabel("Cumulative R"); plt.grid(alpha=.3); plt.tight_layout(); plt.savefig(out / "equity_curve.png", dpi=160); plt.close()
    plt.figure(figsize=(8, 5)); plt.hist(trades["r_multiple"] if not trades.empty else [], bins="auto", edgecolor="white"); plt.title("Trade R-multiple distribution"); plt.xlabel("Net R"); plt.ylabel("Trades"); plt.grid(axis="y", alpha=.3); plt.tight_layout(); plt.savefig(out / "r_distribution.png", dpi=160); plt.close()
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", help="Daily OHLCV CSV with timestamp,open,high,low,close columns")
    parser.add_argument("--output-dir", default="outputs", help="Folder for reports (default: outputs)")
    args = parser.parse_args()
    trades = run_backtest(load_ohlcv(args.csv))
    metrics = write_outputs(trades, args.output_dir)
    print(f"Completed {metrics['trades']} trades. Reports: {Path(args.output_dir).resolve()}")


if __name__ == "__main__":
    main()
