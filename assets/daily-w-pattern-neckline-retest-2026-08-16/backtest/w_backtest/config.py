"""Immutable strategy configuration shared by every backtest stage."""

from dataclasses import dataclass


SYMBOLS = ("BTCUSDT", "ETHUSDT", "SOLUSDT", "PEPEUSDT", "DOGEUSDT")


@dataclass(frozen=True)
class StrategyConfig:
    pivot_span: int = 3
    min_trough_bars: int = 5
    max_trough_bars: int = 60
    trough_similarity: float = 0.03
    support_tolerance: float = 0.02
    support_touches: int = 2
    breakout_window: int = 60
    retest_window: int = 30
    retest_tolerance: float = 0.01
    stop_buffer: float = 0.01
    reward_r: float = 2.0
    breakeven_r: float = 1.0
    max_holding_bars: int = 60
    fee_rate: float = 0.001
    risk_fraction: float = 0.01
    initial_equity: float = 100_000.0
