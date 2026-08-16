"""Binance daily-candle download, caching, normalization, and validation."""

from __future__ import annotations

import json
import hashlib
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import pandas as pd
import numpy as np


REQUIRED = ("date", "open", "high", "low", "close", "volume")
BINANCE_KLINES_URL = "https://api.binance.com/api/v3/klines"
DAY_MS = 86_400_000
CACHE_VERSION = 1


def validate_ohlcv(frame: pd.DataFrame) -> list[str]:
    """Return all detected OHLCV integrity errors in deterministic order."""
    errors: list[str] = []
    if not set(REQUIRED).issubset(frame.columns):
        return ["missing required columns"]
    if not frame["date"].is_monotonic_increasing:
        errors.append("unordered dates")
    if frame["date"].duplicated().any():
        errors.append("duplicate dates")
    numeric = frame[list(REQUIRED[1:])].apply(pd.to_numeric, errors="coerce")
    if not np.isfinite(numeric.to_numpy(dtype=float)).all():
        errors.append("non-finite numeric values")
    prices = numeric[["open", "high", "low", "close"]]
    if (prices <= 0).any().any():
        errors.append("non-positive prices")
    valid_range = (frame["high"] >= prices.max(axis=1)) & (
        frame["low"] <= prices.min(axis=1)
    )
    if not valid_range.all():
        errors.append("invalid OHLC range")
    if frame.empty:
        errors.append("missing daily candles")
    else:
        expected = pd.date_range(frame["date"].min(), frame["date"].max(), freq="D")
        actual = frame["date"].reset_index(drop=True)
        if len(expected) != len(frame) or not actual.equals(pd.Series(expected)):
            errors.append("missing daily candles")
    return errors


def _read_page(symbol: str, start_ms: int, end_ms: int) -> list[list[object]]:
    params = urlencode(
        {
            "symbol": symbol,
            "interval": "1d",
            "startTime": start_ms,
            "endTime": end_ms,
            "limit": 1000,
        }
    )
    request = Request(
        f"{BINANCE_KLINES_URL}?{params}",
        headers={"User-Agent": "w-pattern-retest-backtest/1.0"},
    )
    with urlopen(request, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, list):
        raise RuntimeError(f"Unexpected Binance response for {symbol}: {payload!r}")
    return payload


def _normalize_rows(rows: list[list[object]], end_date: pd.Timestamp) -> pd.DataFrame:
    """Normalize closed candles, conservatively excluding the listing-day candle.

    Binance aligns 1d kline timestamps to 00:00 UTC even when a symbol begins
    trading partway through that date. Because the API does not expose the
    intraday start in a kline row, the first returned candle is always dropped.
    All retained rows must have exact UTC-midnight open timestamps.
    """
    requested_close_ms = int((end_date + pd.Timedelta(days=1)).timestamp() * 1000) - 1
    now_ms = int(pd.Timestamp.now(tz="UTC").timestamp() * 1000)
    ordered_rows = sorted(rows, key=lambda row: int(row[0]))
    retained_rows = ordered_rows[1:] if ordered_rows else []
    if any(int(row[0]) % DAY_MS != 0 for row in retained_rows):
        raise ValueError("Binance daily candle is not aligned to 00:00 UTC")
    records = [
        {
            "date": pd.to_datetime(row[0], unit="ms", utc=True).tz_localize(None).normalize(),
            "open": row[1],
            "high": row[2],
            "low": row[3],
            "close": row[4],
            "volume": row[5],
        }
        for row in retained_rows
        if int(row[6]) <= requested_close_ms and int(row[6]) <= now_ms
    ]
    frame = pd.DataFrame.from_records(records, columns=REQUIRED)
    if frame.empty:
        return frame
    frame["date"] = frame["date"].astype("datetime64[ns]")
    for column in REQUIRED[1:]:
        frame[column] = pd.to_numeric(frame[column], errors="raise")
    frame = frame.loc[frame["date"] <= end_date, list(REQUIRED)]
    return frame.sort_values("date").drop_duplicates("date", keep="last").reset_index(drop=True)


def _cache_metadata_path(cache_path: Path) -> Path:
    return cache_path.with_suffix(".meta.json")


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _validate_boundary_provenance(
    first_downloaded_open_ms: object,
    first_kept_date: object,
    end_date: object,
    source: Path | str,
) -> None:
    """Prove that exactly one aligned listing-day candle was removed."""
    if (
        isinstance(first_downloaded_open_ms, bool)
        or not isinstance(first_downloaded_open_ms, int)
        or first_downloaded_open_ms < 0
        or first_downloaded_open_ms % DAY_MS != 0
    ):
        raise ValueError(f"Invalid boundary provenance in {source}: implausible first open")
    try:
        expected_first = (
            pd.to_datetime(first_downloaded_open_ms, unit="ms", utc=True)
            .tz_localize(None)
            .normalize()
            + pd.Timedelta(days=1)
        )
        recorded_first = pd.Timestamp(first_kept_date).normalize()
        recorded_end = pd.Timestamp(end_date).normalize()
    except (TypeError, ValueError, OverflowError) as exc:
        raise ValueError(f"Invalid boundary provenance in {source}: invalid dates") from exc
    if recorded_first != expected_first or recorded_first > recorded_end:
        raise ValueError(
            f"Invalid boundary provenance in {source}: first retained date does not follow first open"
        )


def _load_cache(
    cache_path: Path,
    symbol: str,
    end_date: pd.Timestamp,
) -> pd.DataFrame | None:
    if not cache_path.exists():
        return None
    metadata_path = _cache_metadata_path(cache_path)
    # A legacy/bare CSV has no proof that downloading began at time zero. It is
    # deliberately ignored and replaced with a provenance-bearing download.
    if not metadata_path.exists():
        return None
    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Invalid cache metadata in {metadata_path}") from exc
    required_metadata = {
        "version",
        "symbol",
        "download_start_ms",
        "first_downloaded_open_ms",
        "first_kept_date",
        "last_kept_date",
        "end_date",
        "row_count",
        "listing_candle_policy",
        "csv_sha256",
    }
    if not required_metadata.issubset(metadata):
        raise ValueError(f"Invalid cache metadata in {metadata_path}: missing fields")
    if (
        metadata["version"] != CACHE_VERSION
        or metadata["symbol"] != symbol
        or metadata["download_start_ms"] != 0
        or metadata["listing_candle_policy"] != "drop_first_returned"
    ):
        raise ValueError(f"Invalid cache provenance in {metadata_path}")
    _validate_boundary_provenance(
        metadata["first_downloaded_open_ms"],
        metadata["first_kept_date"],
        metadata["end_date"],
        metadata_path,
    )
    if _sha256(cache_path) != metadata["csv_sha256"]:
        raise ValueError(f"Invalid cached OHLCV data in {cache_path}: checksum mismatch")
    frame = pd.read_csv(cache_path)
    if not set(REQUIRED).issubset(frame.columns):
        raise ValueError(f"Invalid cached OHLCV data in {cache_path}: missing required columns")
    if "date" in frame:
        frame["date"] = (
            pd.to_datetime(frame["date"], utc=True)
            .dt.tz_localize(None)
            .dt.normalize()
            .astype("datetime64[ns]")
        )
    for column in REQUIRED[1:]:
        if column in frame:
            frame[column] = pd.to_numeric(frame[column], errors="raise")
    errors = validate_ohlcv(frame)
    if errors:
        raise ValueError(f"Invalid cached OHLCV data in {cache_path}: {', '.join(errors)}")
    if frame.empty:
        raise ValueError(f"Invalid cached OHLCV data in {cache_path}: empty cache")
    if (
        len(frame) != int(metadata["row_count"])
        or frame["date"].iloc[0].date().isoformat() != metadata["first_kept_date"]
        or frame["date"].iloc[-1].date().isoformat() != metadata["last_kept_date"]
        or metadata["last_kept_date"] != metadata["end_date"]
    ):
        raise ValueError(f"Invalid cached OHLCV data in {cache_path}: provenance mismatch")
    if frame["date"].iloc[-1] < end_date:
        return None
    requested = frame.loc[frame["date"] <= end_date, list(REQUIRED)].reset_index(drop=True)
    requested_errors = validate_ohlcv(requested)
    if requested_errors:
        raise ValueError(f"Invalid cached OHLCV data in {cache_path}: {', '.join(requested_errors)}")
    return requested


def fetch_all_history(symbol: str, end_date: str | pd.Timestamp, cache_dir: str | Path) -> pd.DataFrame:
    """Fetch all Binance spot daily candles through *end_date*, using a validated CSV cache."""
    normalized_end = pd.Timestamp(end_date)
    if normalized_end.tzinfo is not None:
        normalized_end = normalized_end.tz_convert("UTC").tz_localize(None)
    normalized_end = normalized_end.normalize()

    cache_path = Path(cache_dir) / f"{symbol}.csv"
    cached = _load_cache(cache_path, symbol, normalized_end)
    if cached is not None:
        return cached

    # endTime is inclusive; include the full historical UTC candle at end_date.
    end_ms = int((normalized_end + pd.Timedelta(days=1)).timestamp() * 1000) - 1
    start_ms = 0
    rows: list[list[object]] = []
    while start_ms <= end_ms:
        page = _read_page(symbol, start_ms, end_ms)
        if not page:
            break
        rows.extend(page)
        next_start = int(page[-1][0]) + DAY_MS
        if next_start <= start_ms:
            raise RuntimeError(f"Binance pagination did not advance for {symbol}")
        start_ms = next_start
        if len(page) < 1000:
            break

    frame = _normalize_rows(rows, normalized_end)
    first_downloaded_open_ms = min(int(row[0]) for row in rows) if rows else None
    if not frame.empty:
        _validate_boundary_provenance(
            first_downloaded_open_ms,
            frame["date"].iloc[0],
            normalized_end,
            f"download for {symbol}",
        )
    errors = validate_ohlcv(frame)
    if errors:
        raise ValueError(f"Invalid downloaded OHLCV data for {symbol}: {', '.join(errors)}")
    if frame.empty or frame["date"].iloc[-1] != normalized_end:
        last = "none" if frame.empty else frame["date"].iloc[-1].date().isoformat()
        raise ValueError(
            f"Downloaded OHLCV data for {symbol} ends at {last}, expected {normalized_end.date().isoformat()}"
        )

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(cache_path, index=False, date_format="%Y-%m-%d")
    metadata = {
        "version": CACHE_VERSION,
        "symbol": symbol,
        "download_start_ms": 0,
        "first_downloaded_open_ms": first_downloaded_open_ms,
        "first_kept_date": frame["date"].iloc[0].date().isoformat(),
        "last_kept_date": frame["date"].iloc[-1].date().isoformat(),
        "end_date": normalized_end.date().isoformat(),
        "row_count": len(frame),
        "listing_candle_policy": "drop_first_returned",
        "csv_sha256": _sha256(cache_path),
    }
    _cache_metadata_path(cache_path).write_text(
        json.dumps(metadata, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return frame
