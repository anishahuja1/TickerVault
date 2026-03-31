"""
TickerVault — Stock Data Service.

Dual-source data fetching:
  • yfinance → historical data, company info, quotes
  • Finnhub  → ticker search, news

All external calls run in thread executors to avoid blocking the async event loop.
Results are cached with TTL to minimize API usage.
"""

import asyncio
import logging
from typing import Any

import finnhub
import yfinance as yf

from ..config import get_settings
from ..core.cache import CacheManager, cache
from ..exceptions import StockDataUnavailableError, TickerNotFoundError

logger = logging.getLogger("tickervault.stocks")


class StockService:
    """Provides stock market data from yfinance and Finnhub."""

    def __init__(self):
        settings = get_settings()
        self.finnhub_client = (
            finnhub.Client(api_key=settings.FINNHUB_API_KEY)
            if settings.FINNHUB_API_KEY
            else None
        )

    # ── Search ────────────────────────────────────────────────────────────

    async def search(self, query: str) -> list[dict[str, Any]]:
        """
        Search for stock tickers matching a query.
        Uses Finnhub symbol_lookup for reliability.
        """
        if not query or len(query.strip()) < 1:
            return []

        cache_key = f"search:{query.lower().strip()}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        def _search():
            if self.finnhub_client:
                try:
                    result = self.finnhub_client.symbol_lookup(query)
                    items = result.get("result", [])
                    return [
                        {
                            "ticker": item["symbol"],
                            "name": item.get("description", ""),
                            "type": item.get("type", ""),
                            "primary_exchange": item.get("displaySymbol", ""),
                        }
                        for item in items
                        if item.get("type") in ("Common Stock", "ETP", "ADR")
                        and "." not in item.get("symbol", ".")  # Skip foreign tickers
                    ][:10]
                except Exception as e:
                    logger.warning("Finnhub search failed: %s", e)

            # Fallback: direct yfinance ticker lookup
            try:
                ticker = yf.Ticker(query.upper())
                info = ticker.info
                if info and info.get("symbol"):
                    return [
                        {
                            "ticker": info["symbol"],
                            "name": info.get("longName", info.get("shortName", "")),
                            "type": info.get("quoteType", ""),
                            "primary_exchange": info.get("exchange", ""),
                        }
                    ]
            except Exception:
                pass
            return []

        results = await asyncio.to_thread(_search)
        cache.set(cache_key, results, ttl=CacheManager.TTL_SEARCH)
        return results

    # ── Quote ─────────────────────────────────────────────────────────────

    async def get_quote(self, ticker: str) -> dict[str, Any]:
        """
        Get the latest stock quote using yfinance.

        Returns price, change, volume, and other quote data.
        """
        ticker = ticker.upper()
        cache_key = f"quote:{ticker}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        def _get_quote():
            try:
                t = yf.Ticker(ticker)
                info = t.info
                if not info or not info.get("symbol"):
                    return None

                prev_close = info.get("regularMarketPreviousClose", 0) or 0
                current = info.get(
                    "currentPrice",
                    info.get("regularMarketPrice", prev_close),
                ) or prev_close
                change = round(current - prev_close, 2) if prev_close else 0
                change_pct = (
                    round((change / prev_close) * 100, 2) if prev_close else 0
                )

                return {
                    "ticker": info["symbol"],
                    "name": info.get("longName", info.get("shortName", "")),
                    "price": round(current, 2),
                    "change": change,
                    "change_percent": change_pct,
                    "volume": info.get("regularMarketVolume", 0) or 0,
                    "open": info.get("regularMarketOpen", 0) or 0,
                    "high": info.get("regularMarketDayHigh", 0) or 0,
                    "low": info.get("regularMarketDayLow", 0) or 0,
                    "previous_close": prev_close,
                    "market_cap": info.get("marketCap", 0) or 0,
                }
            except Exception as e:
                logger.error("Quote fetch failed for %s: %s", ticker, e)
                return None

        result = await asyncio.to_thread(_get_quote)
        if result is None:
            raise TickerNotFoundError(ticker)

        cache.set(cache_key, result, ttl=CacheManager.TTL_QUOTE)
        return result

    # ── Batch Quotes ──────────────────────────────────────────────────────

    async def get_batch_quotes(self, tickers: list[str]) -> dict[str, Any]:
        """Fetch quotes for multiple tickers in parallel."""
        results = {}
        tasks = [self.get_quote(t) for t in tickers]
        settled = await asyncio.gather(*tasks, return_exceptions=True)

        for ticker, result in zip(tickers, settled):
            if isinstance(result, dict):
                results[ticker.upper()] = result
            else:
                logger.warning("Batch quote failed for %s: %s", ticker, result)

        return results

    # ── History (OHLCV for charts) ────────────────────────────────────────

    async def get_history(
        self,
        ticker: str,
        period: str = "1mo",
        interval: str = "1d",
    ) -> list[dict[str, Any]]:
        """
        Get OHLCV history for charting.

        Args:
            ticker: Stock symbol
            period: yfinance period string (1d, 5d, 1mo, 3mo, 6mo, 1y, 5y, max)
            interval: candle interval (1m, 5m, 15m, 1h, 1d, 1wk, 1mo)
        """
        ticker = ticker.upper()
        cache_key = f"history:{ticker}:{period}:{interval}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        def _get_history():
            try:
                t = yf.Ticker(ticker)
                df = t.history(period=period, interval=interval)
                if df.empty:
                    return None

                data = []
                for idx, row in df.iterrows():
                    timestamp = int(idx.timestamp())
                    data.append(
                        {
                            "time": timestamp,
                            "open": round(float(row["Open"]), 2),
                            "high": round(float(row["High"]), 2),
                            "low": round(float(row["Low"]), 2),
                            "close": round(float(row["Close"]), 2),
                            "volume": int(row["Volume"]),
                        }
                    )
                return data
            except Exception as e:
                logger.error("History fetch failed for %s: %s", ticker, e)
                return None

        result = await asyncio.to_thread(_get_history)
        if result is None:
            raise TickerNotFoundError(ticker)

        cache.set(cache_key, result, ttl=CacheManager.TTL_HISTORY)
        return result

    # ── Company Info ──────────────────────────────────────────────────────

    async def get_company_info(self, ticker: str) -> dict[str, Any]:
        """Get detailed company information."""
        ticker = ticker.upper()
        cache_key = f"company:{ticker}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        def _get_info():
            try:
                t = yf.Ticker(ticker)
                info = t.info
                if not info or not info.get("symbol"):
                    return None

                return {
                    "ticker": info["symbol"],
                    "name": info.get("longName", info.get("shortName", "")),
                    "sector": info.get("sector", ""),
                    "industry": info.get("industry", ""),
                    "description": info.get("longBusinessSummary", ""),
                    "website": info.get("website", ""),
                    "market_cap": info.get("marketCap", 0) or 0,
                    "employees": info.get("fullTimeEmployees", 0) or 0,
                    "country": info.get("country", ""),
                    "exchange": info.get("exchange", ""),
                }
            except Exception as e:
                logger.error("Company info fetch failed for %s: %s", ticker, e)
                return None

        result = await asyncio.to_thread(_get_info)
        if result is None:
            raise TickerNotFoundError(ticker)

        cache.set(cache_key, result, ttl=CacheManager.TTL_COMPANY)
        return result

    # ── News ──────────────────────────────────────────────────────────────

    async def get_news(self, ticker: str) -> list[dict[str, Any]]:
        """Get recent news articles for a ticker."""
        ticker = ticker.upper()
        cache_key = f"news:{ticker}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        def _get_news():
            articles = []
            try:
                t = yf.Ticker(ticker)
                news = t.news
                if news:
                    for item in news[:10]:
                        content = item.get("content", {})
                        articles.append(
                            {
                                "title": content.get("title", ""),
                                "url": content.get("canonicalUrl", {}).get("url", ""),
                                "source": content.get("provider", {}).get("displayName", ""),
                                "summary": content.get("summary", ""),
                                "image": content.get("thumbnail", {}).get("originalUrl", "") if content.get("thumbnail") else "",
                                "published_at": content.get("pubDate", ""),
                            }
                        )
            except Exception as e:
                logger.warning("News fetch failed for %s: %s", ticker, e)

            return articles

        result = await asyncio.to_thread(_get_news)
        cache.set(cache_key, result, ttl=CacheManager.TTL_NEWS)
        return result

import pandas as pd
from fastapi import HTTPException

def get_stock_history(ticker: str, period: str = "1mo") -> dict:
    """
    Fetch OHLCV history. Returns full OHLC arrays needed for candlestick chart.
    """
    try:
        period_config = {
            "1d":  {"period": "1d",  "interval": "5m"},
            "5d":  {"period": "5d",  "interval": "15m"},
            "1mo": {"period": "1mo", "interval": "1d"},
            "6mo": {"period": "6mo", "interval": "1d"},
            "1y":  {"period": "1y",  "interval": "1wk"},
        }
        cfg = period_config.get(period, {"period": "1mo", "interval": "1d"})

        stock = yf.Ticker(ticker)
        hist  = stock.history(
            period=cfg["period"],
            interval=cfg["interval"],
            auto_adjust=True,
            prepost=False,
        )

        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No history for '{ticker}'")

        hist = hist.sort_index().reset_index()
        hist = hist.dropna(subset=["Close", "Open", "High", "Low"])

        if hist.empty:
            raise HTTPException(status_code=404, detail=f"All data NaN for '{ticker}'")

        date_col = "Datetime" if "Datetime" in hist.columns else "Date"

        dates   = hist[date_col].dt.strftime("%Y-%m-%dT%H:%M:%S").tolist()
        opens   = [round(float(x), 4) for x in hist["Open"].tolist()]
        highs   = [round(float(x), 4) for x in hist["High"].tolist()]
        lows    = [round(float(x), 4) for x in hist["Low"].tolist()]
        closes  = [round(float(x), 4) for x in hist["Close"].tolist()]
        volumes = [int(x) for x in hist["Volume"].tolist()]

        first_close      = closes[0]  if closes else 0
        last_close       = closes[-1] if closes else 0
        period_change    = round(last_close - first_close, 4)
        period_change_pct = round((period_change / first_close * 100) if first_close else 0, 2)

        return {
            "ticker":            ticker.upper(),
            "period":            period,
            "dates":             dates,
            "opens":             opens,
            "highs":             highs,
            "lows":              lows,
            "closes":            closes,
            "volumes":           volumes,
            "period_change":     period_change,
            "period_change_pct": period_change_pct,
            "period_high":       round(max(highs), 4),
            "period_low":        round(min(lows),  4),
            "data_points":       len(closes),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"History error for '{ticker}': {str(e)}")

def get_stock_price(ticker: str) -> dict:
    """
    Fetch current price + change data for a ticker.
    Uses multiple fallback strategies to ensure change is never 0.
    """
    cache_key = f"get_stock_price_v4:{ticker.upper()}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        stock = yf.Ticker(ticker)

        # Strategy 1: fast_info (fastest, works during market hours)
        fi = stock.fast_info

        price      = None
        prev_close = None

        try:
            price      = float(fi.last_price)      if fi.last_price      else None
            prev_close = float(fi.previous_close)  if fi.previous_close  else None
        except Exception:
            pass

        # Strategy 2: if fast_info failed, use .info dict
        if not price or not prev_close:
            try:
                info       = stock.info
                price      = price      or float(info.get("currentPrice") or info.get("regularMarketPrice") or 0)
                prev_close = prev_close or float(info.get("previousClose") or info.get("regularMarketPreviousClose") or 0)
            except Exception:
                pass

        # Strategy 3: if still no prev_close, pull last 5 days history and use day[-2] close
        if not prev_close or prev_close == 0:
            try:
                hist = stock.history(period="5d", interval="1d", auto_adjust=True)
                hist = hist.dropna(subset=["Close"])
                if len(hist) >= 2:
                    prev_close = float(hist["Close"].iloc[-2])
                elif len(hist) == 1:
                    prev_close = float(hist["Close"].iloc[0])
            except Exception:
                pass

        # Strategy 4: last resort — get current price from history if still missing
        if not price or price == 0:
            try:
                hist  = stock.history(period="1d", interval="1m", auto_adjust=True)
                hist  = hist.dropna(subset=["Close"])
                if not hist.empty:
                    price = float(hist["Close"].iloc[-1])
            except Exception:
                pass

        # Final validation
        if not price or price == 0:
            raise HTTPException(
                status_code=404,
                detail=f"Could not fetch price for ticker '{ticker}'"
            )

        # Safe prev_close fallback
        if not prev_close or prev_close == 0:
            prev_close = price  # change will be 0 but won't crash

        # Calculate change
        price      = round(price, 4)
        prev_close = round(prev_close, 4)
        change     = round(price - prev_close, 4)
        change_pct = round((change / prev_close) * 100, 4) if prev_close != 0 else 0.0

        # Get high/low/volume/open from fast_info with fallbacks
        try:
            day_high   = round(float(fi.day_high   or price), 2)
            day_low    = round(float(fi.day_low    or price), 2)
            open_price = round(float(fi.open       or prev_close), 2)
            volume     = int(fi.volume             or 0)
            market_cap = int(fi.market_cap         or 0)
        except Exception:
            day_high = day_low = open_price = price
            volume = market_cap = 0

        # Company name and currency
        name     = ticker
        currency = "USD"
        exchange = ""
        try:
            info     = stock.info
            name     = info.get("longName") or info.get("shortName") or ticker
            currency = info.get("currency", "USD")
            exchange = info.get("exchange", "")
        except Exception:
            pass

        result = {
            "ticker":         ticker.upper(),
            "name":           name,
            "price":          price,
            "prev_close":     prev_close,
            "change":         change,
            "change_percent": change_pct,
            "open":           open_price,
            "high":           day_high,
            "low":            day_low,
            "volume":         volume,
            "market_cap":     market_cap,
            "currency":       currency,
            "exchange":       exchange,
        }

        # Cache the successful fetch for 10 seconds to prevent rate limits
        cache.set(cache_key, result, ttl=10)
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching '{ticker}': {str(e)}"
        )
