"""Look-ahead-safe detection of daily-support W neckline-retest signals."""

from __future__ import annotations

from collections import Counter

import numpy as np
import pandas as pd

from .config import StrategyConfig


CANDIDATE_COLUMNS = (
    "first_trough_idx",
    "second_trough_idx",
    "first_trough_low",
    "second_trough_low",
    "lower_trough",
    "support_level",
    "support_touch_count",
    "neckline",
)

SIGNAL_COLUMNS = (
    "first_trough_idx",
    "second_trough_idx",
    "neckline",
    "breakout_idx",
    "retest_idx",
    "entry_idx",
    "support_touch_count",
)


def mark_pivots(frame: pd.DataFrame, span: int) -> pd.DataFrame:
    """Mark pivots on their candle while recording when each becomes knowable.

    ``pivot_low`` and ``pivot_high`` describe the eventual classification of a
    candle.  Consumers must use ``pivot_confirm_idx`` (pivot index + ``span``)
    when deciding when that information was available.
    """
    if isinstance(span, bool) or not isinstance(span, (int, np.integer)) or span < 1:
        raise ValueError("span must be a positive integer")

    out = frame.reset_index(drop=True).copy()
    lows = pd.to_numeric(out["low"], errors="raise").to_numpy(dtype=float)
    highs = pd.to_numeric(out["high"], errors="raise").to_numpy(dtype=float)
    pivot_low = np.zeros(len(out), dtype=bool)
    pivot_high = np.zeros(len(out), dtype=bool)

    for idx in range(span, len(out) - span):
        pivot_low[idx] = (
            lows[idx] < lows[idx - span : idx].min()
            and lows[idx] <= lows[idx + 1 : idx + span + 1].min()
        )
        pivot_high[idx] = (
            highs[idx] > highs[idx - span : idx].max()
            and highs[idx] >= highs[idx + 1 : idx + span + 1].max()
        )

    out["pivot_low"] = pivot_low
    out["pivot_high"] = pivot_high
    # Keeping the arithmetic confirmation index on every row makes timing
    # audits simple; only rows marked as pivots are consumed downstream.
    out["pivot_confirm_idx"] = np.arange(len(out), dtype=int) + int(span)
    return out


def _within(reference: float, value: float, tolerance: float) -> bool:
    """Return whether value is within tolerance relative to reference."""
    return abs(value - reference) / reference <= tolerance + 1e-12


def detect_candidates(frame: pd.DataFrame, cfg: StrategyConfig) -> pd.DataFrame:
    """Enumerate support-qualified W candidates without using future support.

    Support is formed only from pivot lows whose candle *and confirmation*
    precede the first W trough.  The support cluster is the median of eligible
    prior lows; both W troughs must be within the configured tolerance of it.
    """
    marked = mark_pivots(frame, cfg.pivot_span)
    pivot_indices = marked.index[marked["pivot_low"]].to_list()
    rows: list[dict[str, float | int]] = []
    counts: Counter[str] = Counter(
        {
            "pairs_considered": 0,
            "rejected_spacing": 0,
            "rejected_similarity": 0,
            "rejected_support": 0,
            "rejected_structure": 0,
            "w_candidates": 0,
        }
    )

    for position, first_idx in enumerate(pivot_indices):
        first_low = float(marked.at[first_idx, "low"])
        for second_idx in pivot_indices[position + 1 :]:
            counts["pairs_considered"] += 1
            spacing = second_idx - first_idx
            if not cfg.min_trough_bars <= spacing <= cfg.max_trough_bars:
                counts["rejected_spacing"] += 1
                continue

            second_low = float(marked.at[second_idx, "low"])
            lower_trough = min(first_low, second_low)
            if not _within(lower_trough, max(first_low, second_low), cfg.trough_similarity):
                counts["rejected_similarity"] += 1
                continue

            prior = marked.loc[
                marked["pivot_low"]
                & (marked.index < first_idx)
                & (marked["pivot_confirm_idx"] < first_idx)
            ]
            support = prior.loc[
                prior["low"].map(
                    lambda price: _within(
                        lower_trough, float(price), cfg.support_tolerance
                    )
                )
            ]
            if len(support) < cfg.support_touches:
                counts["rejected_support"] += 1
                continue

            support_level = float(support["low"].median())
            if not (
                _within(support_level, first_low, cfg.support_tolerance)
                and _within(support_level, second_low, cfg.support_tolerance)
            ):
                counts["rejected_support"] += 1
                continue

            intervening = marked.iloc[first_idx + 1 : second_idx]
            if intervening.empty:
                counts["rejected_structure"] += 1
                continue
            neckline = float(intervening["high"].max())
            rows.append(
                {
                    "first_trough_idx": int(first_idx),
                    "second_trough_idx": int(second_idx),
                    "first_trough_low": first_low,
                    "second_trough_low": second_low,
                    "lower_trough": lower_trough,
                    "support_level": support_level,
                    "support_touch_count": int(len(support)),
                    "neckline": neckline,
                }
            )
            counts["w_candidates"] += 1

    result = pd.DataFrame(rows, columns=CANDIDATE_COLUMNS)
    result.attrs["candidate_counts"] = dict(counts)
    return result


def detect_signals(
    frame: pd.DataFrame, cfg: StrategyConfig
) -> tuple[pd.DataFrame, dict[str, int]]:
    """Return executable next-open signals and auditable detection-funnel counts."""
    clean = frame.reset_index(drop=True)
    candidates = detect_candidates(clean, cfg)
    marked = mark_pivots(clean, cfg.pivot_span)
    candidate_counts = candidates.attrs.get("candidate_counts", {})
    counts: Counter[str] = Counter(candidate_counts)
    counts["w_candidates"] = len(candidates)
    counts.update(
        {
            "confirmed_breakouts": 0,
            "qualifying_retests": 0,
            "executable_signal_candidates": 0,
            "valid_retests": 0,
            "signals": 0,
        }
    )
    signals: list[dict[str, float | int]] = []
    valid_retest_indices: set[int] = set()

    for candidate in candidates.itertuples(index=False):
        second_idx = int(candidate.second_trough_idx)
        second_confirm_idx = int(marked.at[second_idx, "pivot_confirm_idx"])
        breakout_start = max(second_idx + 1, second_confirm_idx)
        breakout_end = min(len(clean) - 1, second_idx + cfg.breakout_window)
        breakout_idx = next(
            (
                idx
                for idx in range(breakout_start, breakout_end + 1)
                if float(clean.at[idx, "close"]) > float(candidate.neckline)
            ),
            None,
        )
        if breakout_idx is None:
            continue
        counts["confirmed_breakouts"] += 1

        retest_end = min(len(clean) - 1, breakout_idx + cfg.retest_window)
        band_low = float(candidate.neckline) * (1.0 - cfg.retest_tolerance)
        band_high = float(candidate.neckline) * (1.0 + cfg.retest_tolerance)
        retest_idx = next(
            (
                idx
                for idx in range(breakout_idx + 1, retest_end + 1)
                if float(clean.at[idx, "high"]) >= band_low
                and float(clean.at[idx, "low"]) <= band_high
                and float(clean.at[idx, "close"]) >= float(candidate.neckline)
            ),
            None,
        )
        if retest_idx is None:
            continue
        counts["qualifying_retests"] += 1
        valid_retest_indices.add(int(retest_idx))
        if retest_idx + 1 >= len(clean):
            continue
        counts["executable_signal_candidates"] += 1

        signals.append(
            {
                "first_trough_idx": int(candidate.first_trough_idx),
                "second_trough_idx": second_idx,
                "neckline": float(candidate.neckline),
                "breakout_idx": int(breakout_idx),
                "retest_idx": int(retest_idx),
                "entry_idx": int(retest_idx + 1),
                "support_touch_count": int(candidate.support_touch_count),
            }
        )

    result = pd.DataFrame(signals, columns=SIGNAL_COLUMNS)
    if not result.empty:
        result = (
            result.sort_values(
                ["retest_idx", "second_trough_idx"], ascending=[True, False]
            )
            .drop_duplicates("retest_idx", keep="first")
            .sort_values("retest_idx")
            .reset_index(drop=True)
        )
    # Count unique qualifying retest candles even when the sample ends before
    # their next-open entry; executed-trade counts are reported downstream.
    counts["valid_retests"] = len(valid_retest_indices)
    counts["signals"] = len(result)
    return result, dict(counts)
