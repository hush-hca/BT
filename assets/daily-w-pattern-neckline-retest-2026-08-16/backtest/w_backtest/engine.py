"""Deterministic daily-bar trade and shared-portfolio simulation."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .config import StrategyConfig


TRADE_COLUMNS = (
    "symbol",
    "first_trough_idx",
    "second_trough_idx",
    "first_trough_date",
    "second_trough_date",
    "first_trough_low",
    "second_trough_low",
    "neckline",
    "support_touch_count",
    "breakout_idx",
    "breakout_date",
    "retest_idx",
    "retest_date",
    "entry_idx",
    "entry_date",
    "entry_price",
    "initial_stop",
    "risk_per_unit",
    "target_price",
    "breakeven_trigger",
    "exit_idx",
    "exit_date",
    "exit_price",
    "exit_reason",
    "holding_bars",
    "gross_r",
    "quantity",
    "risk_amount",
    "gross_pnl",
    "entry_fee",
    "exit_fee",
    "fees",
    "net_pnl",
    "net_r",
    "equity_before_entry",
    "equity_after_entry",
    "equity_after_exit",
    "concurrent_open_risk",
    "concurrent_open_risk_pct",
)


@dataclass(frozen=True)
class _Outcome:
    """Price-only outcome of one signal, before portfolio sizing."""

    signal: dict
    entry_idx: int
    entry_date: pd.Timestamp
    entry_price: float
    initial_stop: float
    target_price: float
    breakeven_trigger: float
    exit_idx: int
    exit_date: pd.Timestamp
    exit_price: float
    exit_reason: str
    holding_bars: int
    gross_r: float


def _normalise_frame(frame: pd.DataFrame) -> pd.DataFrame:
    out = frame.reset_index(drop=True).copy()
    out["date"] = pd.to_datetime(out["date"])
    return out


def _normalise_signals(signals: pd.DataFrame | pd.Series | dict | None) -> pd.DataFrame:
    if signals is None:
        return pd.DataFrame()
    if isinstance(signals, pd.Series):
        return signals.to_frame().T.reset_index(drop=True)
    if isinstance(signals, dict):
        return pd.DataFrame([signals])
    return signals.reset_index(drop=True).copy()


def _scan_outcome(
    frame: pd.DataFrame, signal: dict, cfg: StrategyConfig
) -> _Outcome | None:
    """Scan one signal using conservative daily-candle threshold ordering."""
    entry_idx = int(signal["entry_idx"])
    if entry_idx < 0 or entry_idx >= len(frame):
        return None

    first_idx = int(signal["first_trough_idx"])
    second_idx = int(signal["second_trough_idx"])
    if min(first_idx, second_idx) < 0 or max(first_idx, second_idx) >= len(frame):
        return None

    entry_price = float(frame.at[entry_idx, "open"])
    lower_trough = min(
        float(frame.at[first_idx, "low"]), float(frame.at[second_idx, "low"])
    )
    initial_stop = lower_trough * (1.0 - cfg.stop_buffer)
    risk_per_unit = entry_price - initial_stop
    if not np.isfinite(risk_per_unit) or risk_per_unit <= 0:
        return None

    target = entry_price + cfg.reward_r * risk_per_unit
    trigger = entry_price + cfg.breakeven_r * risk_per_unit
    active_stop = initial_stop
    breakeven_pending = False

    # Exactly max_holding_bars candles are eligible for stop/target handling,
    # with the entry candle counted as bar one.
    last_managed_idx = min(len(frame) - 1, entry_idx + cfg.max_holding_bars - 1)
    for idx in range(entry_idx, last_managed_idx + 1):
        if breakeven_pending:
            active_stop = entry_price
            breakeven_pending = False

        low = float(frame.at[idx, "low"])
        high = float(frame.at[idx, "high"])

        # An already-active stop wins every ambiguous same-candle path.
        if low <= active_stop:
            reason = "breakeven" if active_stop == entry_price else "stop"
            exit_price = active_stop
        elif high >= target:
            reason = "target"
            exit_price = target
        else:
            if active_stop < entry_price and high >= trigger:
                # The raised stop becomes active only on the following candle.
                breakeven_pending = True
            continue

        return _Outcome(
            signal=signal,
            entry_idx=entry_idx,
            entry_date=pd.Timestamp(frame.at[entry_idx, "date"]),
            entry_price=entry_price,
            initial_stop=initial_stop,
            target_price=target,
            breakeven_trigger=trigger,
            exit_idx=idx,
            exit_date=pd.Timestamp(frame.at[idx, "date"]),
            exit_price=exit_price,
            exit_reason=reason,
            holding_bars=idx - entry_idx + 1,
            gross_r=(exit_price - entry_price) / risk_per_unit,
        )

    next_idx = entry_idx + cfg.max_holding_bars
    if next_idx < len(frame):
        exit_idx = next_idx
        exit_price = float(frame.at[exit_idx, "open"])
        reason = "time"
        holding_bars = cfg.max_holding_bars
    else:
        exit_idx = len(frame) - 1
        exit_price = float(frame.at[exit_idx, "close"])
        reason = "end_of_data"
        holding_bars = exit_idx - entry_idx + 1

    return _Outcome(
        signal=signal,
        entry_idx=entry_idx,
        entry_date=pd.Timestamp(frame.at[entry_idx, "date"]),
        entry_price=entry_price,
        initial_stop=initial_stop,
        target_price=target,
        breakeven_trigger=trigger,
        exit_idx=exit_idx,
        exit_date=pd.Timestamp(frame.at[exit_idx, "date"]),
        exit_price=exit_price,
        exit_reason=reason,
        holding_bars=holding_bars,
        gross_r=(exit_price - entry_price) / risk_per_unit,
    )


def _candidate_outcomes(
    frames: dict[str, pd.DataFrame],
    signals_by_symbol: dict[str, pd.DataFrame],
    cfg: StrategyConfig,
) -> list[tuple[str, _Outcome]]:
    outcomes: list[tuple[str, _Outcome]] = []
    for symbol in sorted(frames):
        frame = frames[symbol]
        signals = _normalise_signals(signals_by_symbol.get(symbol))
        if signals.empty:
            continue
        ordered = signals.sort_values(["entry_idx", "retest_idx"], kind="stable")
        for signal in ordered.to_dict("records"):
            outcome = _scan_outcome(frame, signal, cfg)
            if outcome is not None:
                outcomes.append((symbol, outcome))
    return outcomes


def _signal_value(signal: dict, name: str, default=np.nan):
    value = signal.get(name, default)
    return default if pd.isna(value) else value


def _date_at(frame: pd.DataFrame, idx) -> pd.Timestamp | pd.NaT:
    if pd.isna(idx):
        return pd.NaT
    integer = int(idx)
    if integer < 0 or integer >= len(frame):
        return pd.NaT
    return pd.Timestamp(frame.at[integer, "date"])


def simulate_portfolio(
    frames: dict[str, pd.DataFrame],
    signals_by_symbol: dict[str, pd.DataFrame],
    cfg: StrategyConfig,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Simulate one shared-equity portfolio with deterministic event ordering.

    Exits are processed before entries on a date.  New entries are processed in
    alphabetical symbol order and risk one configured fraction of then-current
    equity.  Entry fees are debited immediately; gross P&L and exit fees are
    booked at exit.  Thus every later same-day entry sees earlier entry costs.
    """
    normal_frames = {symbol: _normalise_frame(frame) for symbol, frame in frames.items()}
    candidates = _candidate_outcomes(normal_frames, signals_by_symbol, cfg)
    entries_by_date: dict[pd.Timestamp, list[tuple[str, _Outcome]]] = {}
    for symbol, outcome in candidates:
        entries_by_date.setdefault(outcome.entry_date, []).append((symbol, outcome))

    all_dates = sorted(entries_by_date)
    equity = float(cfg.initial_equity)
    open_positions: dict[str, dict] = {}
    rows: list[dict] = []
    curve_rows: list[dict] = []

    # Candidate exit dates become real events only after their entries are
    # accepted, hence the event calendar grows during iteration.
    pending_dates = set(all_dates)
    while pending_dates:
        date = min(pending_dates)
        pending_dates.remove(date)

        equity_before_events = equity
        exit_cashflow = 0.0
        entry_fees_on_date = 0.0

        exiting = sorted(
            (
                (symbol, position)
                for symbol, position in open_positions.items()
                if position["outcome"].exit_date == date
            ),
            key=lambda item: item[0],
        )
        for symbol, position in exiting:
            outcome = position["outcome"]
            quantity = position["quantity"]
            gross_pnl = quantity * (outcome.exit_price - outcome.entry_price)
            exit_fee = quantity * outcome.exit_price * cfg.fee_rate
            entry_fee = position["entry_fee"]
            fees = entry_fee + exit_fee
            net_pnl = gross_pnl - fees
            cashflow = gross_pnl - exit_fee
            equity += cashflow
            exit_cashflow += cashflow
            row = position["row"]
            row.update(
                gross_pnl=gross_pnl,
                entry_fee=entry_fee,
                exit_fee=exit_fee,
                fees=fees,
                net_pnl=net_pnl,
                net_r=net_pnl / position["risk_amount"],
                equity_after_exit=equity,
            )
            rows.append(row)
            del open_positions[symbol]

        # Pop the batch so entries are considered only once at their open.
        entries = sorted(entries_by_date.pop(date, []), key=lambda item: item[0])
        same_day_exits: list[str] = []
        for symbol, outcome in entries:
            if symbol in open_positions:
                continue
            risk_per_unit = outcome.entry_price - outcome.initial_stop
            risk_amount = equity * cfg.risk_fraction
            quantity = risk_amount / risk_per_unit
            equity_before_entry = equity
            entry_fee = quantity * outcome.entry_price * cfg.fee_rate
            equity -= entry_fee
            entry_fees_on_date += entry_fee
            concurrent_risk = sum(p["risk_amount"] for p in open_positions.values()) + risk_amount
            signal = outcome.signal
            frame = normal_frames[symbol]
            row = {
                "symbol": symbol,
                "first_trough_idx": int(signal["first_trough_idx"]),
                "second_trough_idx": int(signal["second_trough_idx"]),
                "first_trough_date": _date_at(frame, signal["first_trough_idx"]),
                "second_trough_date": _date_at(frame, signal["second_trough_idx"]),
                "first_trough_low": float(frame.at[int(signal["first_trough_idx"]), "low"]),
                "second_trough_low": float(frame.at[int(signal["second_trough_idx"]), "low"]),
                "neckline": float(_signal_value(signal, "neckline")),
                "support_touch_count": int(_signal_value(signal, "support_touch_count", 0)),
                "breakout_idx": int(_signal_value(signal, "breakout_idx")),
                "breakout_date": _date_at(frame, _signal_value(signal, "breakout_idx")),
                "retest_idx": int(_signal_value(signal, "retest_idx")),
                "retest_date": _date_at(frame, _signal_value(signal, "retest_idx")),
                "entry_idx": outcome.entry_idx,
                "entry_date": outcome.entry_date,
                "entry_price": outcome.entry_price,
                "initial_stop": outcome.initial_stop,
                "risk_per_unit": risk_per_unit,
                "target_price": outcome.target_price,
                "breakeven_trigger": outcome.breakeven_trigger,
                "exit_idx": outcome.exit_idx,
                "exit_date": outcome.exit_date,
                "exit_price": outcome.exit_price,
                "exit_reason": outcome.exit_reason,
                "holding_bars": outcome.holding_bars,
                "gross_r": outcome.gross_r,
                "quantity": quantity,
                "risk_amount": risk_amount,
                "gross_pnl": np.nan,
                "entry_fee": entry_fee,
                "exit_fee": np.nan,
                "fees": np.nan,
                "net_pnl": np.nan,
                "net_r": np.nan,
                "equity_before_entry": equity_before_entry,
                "equity_after_entry": equity,
                "equity_after_exit": np.nan,
                "concurrent_open_risk": concurrent_risk,
                "concurrent_open_risk_pct": (
                    concurrent_risk / equity_before_entry
                    if equity_before_entry
                    else np.nan
                ),
            }
            open_positions[symbol] = {
                "outcome": outcome,
                "quantity": quantity,
                "risk_amount": risk_amount,
                "entry_fee": entry_fee,
                "row": row,
            }
            if outcome.exit_date == date:
                same_day_exits.append(symbol)
            else:
                pending_dates.add(outcome.exit_date)

        # Positions can hit a threshold on their entry candle.  They close
        # after all same-open entries have been sized, never before those opens.
        for symbol in sorted(same_day_exits):
            position = open_positions[symbol]
            outcome = position["outcome"]
            quantity = position["quantity"]
            gross_pnl = quantity * (outcome.exit_price - outcome.entry_price)
            exit_fee = quantity * outcome.exit_price * cfg.fee_rate
            entry_fee = position["entry_fee"]
            fees = entry_fee + exit_fee
            net_pnl = gross_pnl - fees
            cashflow = gross_pnl - exit_fee
            equity += cashflow
            exit_cashflow += cashflow
            row = position["row"]
            row.update(
                gross_pnl=gross_pnl,
                entry_fee=entry_fee,
                exit_fee=exit_fee,
                fees=fees,
                net_pnl=net_pnl,
                net_r=net_pnl / position["risk_amount"],
                equity_after_exit=equity,
            )
            rows.append(row)
            del open_positions[symbol]

        curve_rows.append(
            {
                "date": date,
                "equity_before_events": equity_before_events,
                "exit_cashflow": exit_cashflow,
                "entry_fees": entry_fees_on_date,
                "equity": equity,
                "open_risk": sum(
                    p["risk_amount"] for p in open_positions.values()
                ),
                "open_positions": len(open_positions),
            }
        )

    ledger = pd.DataFrame(rows, columns=TRADE_COLUMNS)
    if not ledger.empty:
        ledger = ledger.sort_values(["entry_date", "symbol"], kind="stable").reset_index(drop=True)
    curve = pd.DataFrame(
        curve_rows,
        columns=[
            "date", "equity_before_events", "exit_cashflow", "entry_fees",
            "equity", "open_risk", "open_positions",
        ],
    )
    if not curve.empty:
        curve = curve.drop_duplicates("date", keep="last").sort_values("date").reset_index(drop=True)
    return ledger, curve


def simulate_symbol(
    frame: pd.DataFrame,
    signals: pd.DataFrame | pd.Series | dict,
    cfg: StrategyConfig,
) -> pd.DataFrame:
    """Simulate one symbol independently using the same portfolio semantics."""
    ledger, _ = simulate_portfolio(
        {"SYMBOL": frame}, {"SYMBOL": _normalise_signals(signals)}, cfg
    )
    return ledger
