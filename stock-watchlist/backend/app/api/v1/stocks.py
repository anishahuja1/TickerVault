"""
TickerVault — Stock Data Endpoints.

GET /api/v1/stocks/search         — Search tickers
GET /api/v1/stocks/{ticker}/quote — Get stock quote
GET /api/v1/stocks/{ticker}/history — Get OHLCV history
GET /api/v1/stocks/{ticker}/indicators — Get technical indicators
GET /api/v1/stocks/{ticker}/info  — Get company info
GET /api/v1/stocks/{ticker}/news  — Get news articles
GET /api/v1/stocks/batch          — Batch quotes

All stock data endpoints require authentication (no demo mode).
"""

import asyncio

from fastapi import APIRouter, Depends, Query

from ...core.dependencies import get_current_user
from ...models.user import User
from ...schemas.stock import (
    BatchQuoteResponse,
    CompanyInfo,
    IndicatorResponse,
    NewsArticle,
    StockQuote,
    StockSearchResponse,
    StockSearchResult,
)
from ...services.stock_service import StockService
from ...utils.indicators import compute_indicator

import yfinance as yf

router = APIRouter()


def get_stock_service() -> StockService:
    return StockService()


@router.get("/search", response_model=StockSearchResponse)
async def search_tickers(
    q: str = Query(..., min_length=1, max_length=20, description="Search query"),
    _user: User = Depends(get_current_user),
    service: StockService = Depends(get_stock_service),
):
    """Search for stock tickers by symbol or company name."""
    results = await service.search(q)
    return StockSearchResponse(
        results=[StockSearchResult(**r) for r in results],
        count=len(results),
    )


from ...services.stock_service import get_stock_history, get_stock_price, StockService

@router.get("/{ticker}/history")
async def get_history(
    ticker: str,
    period: str = Query(default="1mo", regex="^(1d|5d|1mo|6mo|1y)$")
):
    """Get OHLCV history for charting."""
    return get_stock_history(ticker.upper(), period)

@router.get("/{ticker}/quote")
async def get_quote(
    ticker: str,
):
    """Get the latest stock quote."""
    return get_stock_price(ticker.upper())


@router.get("/{ticker}/indicators", response_model=IndicatorResponse)
async def get_indicators(
    ticker: str,
    types: str = Query("sma", description="Comma-separated: sma, ema, rsi, macd, bollinger"),
    period: str = Query("6mo", description="History period for calculation"),
    indicator_period: int = Query(20, ge=2, le=200, description="Indicator period"),
    _user: User = Depends(get_current_user),
):
    """
    Compute technical indicators for a ticker.

    The indicator is calculated on historical data fetched from yfinance.
    """
    # Fetch raw historical data
    def _compute():
        t = yf.Ticker(ticker.upper())
        df = t.history(period=period, interval="1d")
        if df.empty:
            return None

        indicator_type = types.split(",")[0].strip().lower()
        data = compute_indicator(df, indicator_type, indicator_period)
        return data

    data = await asyncio.to_thread(_compute)
    if data is None:
        return IndicatorResponse(ticker=ticker.upper(), indicator=types, period=period, data=[])

    return IndicatorResponse(
        ticker=ticker.upper(),
        indicator=types.split(",")[0].strip(),
        period=period,
        data=data,
    )


@router.get("/{ticker}/info", response_model=CompanyInfo)
async def get_company_info(
    ticker: str,
    _user: User = Depends(get_current_user),
    service: StockService = Depends(get_stock_service),
):
    """Get detailed company information."""
    data = await service.get_company_info(ticker)
    return CompanyInfo(**data)


@router.get("/{ticker}/news")
async def get_news(
    ticker: str,
    _user: User = Depends(get_current_user),
    service: StockService = Depends(get_stock_service),
):
    """Get recent news articles for a ticker."""
    articles = await service.get_news(ticker)
    return {"ticker": ticker.upper(), "articles": articles, "count": len(articles)}


@router.get("/batch/quotes", response_model=BatchQuoteResponse)
async def get_batch_quotes(
    tickers: str = Query(..., description="Comma-separated ticker symbols"),
    _user: User = Depends(get_current_user),
    service: StockService = Depends(get_stock_service),
):
    """Get quotes for multiple tickers at once."""
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    quotes_data = await service.get_batch_quotes(ticker_list)
    return BatchQuoteResponse(
        quotes={k: StockQuote(**v) for k, v in quotes_data.items()}
    )
