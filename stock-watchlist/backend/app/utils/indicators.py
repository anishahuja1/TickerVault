"""
TickerVault — Technical Indicator Calculations.

Uses pandas-ta to compute industry-standard technical indicators
on yfinance OHLCV data. All functions return JSON-serializable data
for frontend charting with TradingView Lightweight Charts.
"""

import logging
from typing import Any

import pandas as pd
import pandas_ta as ta

logger = logging.getLogger("tickervault.indicators")


def _series_to_points(series: pd.Series) -> list[dict[str, Any]]:
    """Convert a pandas Series with DatetimeIndex to chart data points."""
    points = []
    for idx, val in series.items():
        if pd.notna(val):
            points.append({"time": int(idx.timestamp()), "value": round(float(val), 4)})
    return points


def calculate_sma(df: pd.DataFrame, period: int = 20) -> list[dict[str, Any]]:
    """
    Simple Moving Average.

    The SMA smooths price data to identify trend direction.
    Common periods: 20 (short-term), 50 (medium), 200 (long-term).
    """
    sma = ta.sma(df["Close"], length=period)
    if sma is None:
        return []
    return _series_to_points(sma)


def calculate_ema(df: pd.DataFrame, period: int = 20) -> list[dict[str, Any]]:
    """
    Exponential Moving Average.

    Gives more weight to recent prices than SMA.
    Common periods: 12, 26 (used in MACD), 20, 50.
    """
    ema = ta.ema(df["Close"], length=period)
    if ema is None:
        return []
    return _series_to_points(ema)


def calculate_rsi(df: pd.DataFrame, period: int = 14) -> list[dict[str, Any]]:
    """
    Relative Strength Index (0–100).

    >70 = overbought (potential sell signal)
    <30 = oversold (potential buy signal)
    Standard period: 14 days.
    """
    rsi = ta.rsi(df["Close"], length=period)
    if rsi is None:
        return []
    return _series_to_points(rsi)


def calculate_macd(df: pd.DataFrame) -> dict[str, list[dict[str, Any]]]:
    """
    Moving Average Convergence Divergence.

    Returns three series:
    - macd: MACD line (12-EMA minus 26-EMA)
    - signal: 9-period EMA of MACD line
    - histogram: MACD minus Signal (momentum)
    """
    macd_df = ta.macd(df["Close"])
    if macd_df is None or macd_df.empty:
        return {"macd": [], "signal": [], "histogram": []}

    result = {"macd": [], "signal": [], "histogram": []}
    cols = macd_df.columns.tolist()

    for idx in macd_df.index:
        time_val = int(idx.timestamp())
        if len(cols) >= 3:
            if pd.notna(macd_df.loc[idx, cols[0]]):
                result["macd"].append(
                    {"time": time_val, "value": round(float(macd_df.loc[idx, cols[0]]), 4)}
                )
            if pd.notna(macd_df.loc[idx, cols[1]]):
                result["histogram"].append(
                    {"time": time_val, "value": round(float(macd_df.loc[idx, cols[1]]), 4)}
                )
            if pd.notna(macd_df.loc[idx, cols[2]]):
                result["signal"].append(
                    {"time": time_val, "value": round(float(macd_df.loc[idx, cols[2]]), 4)}
                )

    return result


def calculate_bollinger(
    df: pd.DataFrame, period: int = 20
) -> dict[str, list[dict[str, Any]]]:
    """
    Bollinger Bands.

    Upper/lower bands at ±2 standard deviations from SMA.
    Price near upper band = potentially overbought.
    Price near lower band = potentially oversold.
    """
    bbands = ta.bbands(df["Close"], length=period)
    if bbands is None or bbands.empty:
        return {"upper": [], "middle": [], "lower": []}

    result = {"upper": [], "middle": [], "lower": []}
    cols = bbands.columns.tolist()

    for idx in bbands.index:
        time_val = int(idx.timestamp())
        # bbands returns: BBL, BBM, BBU, BBB, BBP
        if len(cols) >= 3:
            if pd.notna(bbands.loc[idx, cols[0]]):
                result["lower"].append(
                    {"time": time_val, "value": round(float(bbands.loc[idx, cols[0]]), 2)}
                )
            if pd.notna(bbands.loc[idx, cols[1]]):
                result["middle"].append(
                    {"time": time_val, "value": round(float(bbands.loc[idx, cols[1]]), 2)}
                )
            if pd.notna(bbands.loc[idx, cols[2]]):
                result["upper"].append(
                    {"time": time_val, "value": round(float(bbands.loc[idx, cols[2]]), 2)}
                )

    return result


# ── Convenience wrapper ───────────────────────────────────────────────────


INDICATOR_MAP = {
    "sma": calculate_sma,
    "ema": calculate_ema,
    "rsi": calculate_rsi,
    "macd": calculate_macd,
    "bollinger": calculate_bollinger,
}


def compute_indicator(
    df: pd.DataFrame, indicator_type: str, period: int = 20
) -> Any:
    """
    Compute an indicator by name.

    Args:
        df: OHLCV DataFrame with DatetimeIndex
        indicator_type: One of 'sma', 'ema', 'rsi', 'macd', 'bollinger'
        period: Period for the indicator (ignored for MACD)
    """
    func = INDICATOR_MAP.get(indicator_type.lower())
    if func is None:
        raise ValueError(f"Unknown indicator: {indicator_type}")

    if indicator_type.lower() in ("macd", "bollinger"):
        if indicator_type.lower() == "bollinger":
            return func(df, period)
        return func(df)
    return func(df, period)
