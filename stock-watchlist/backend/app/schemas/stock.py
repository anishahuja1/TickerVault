"""
TickerVault — Stock Data Schemas.
"""

from pydantic import BaseModel


class StockQuote(BaseModel):
    """Real-time or delayed stock quote."""
    ticker: str
    name: str = ""
    price: float = 0.0
    change: float = 0.0
    change_percent: float = 0.0
    volume: int = 0
    open: float = 0.0
    high: float = 0.0
    low: float = 0.0
    previous_close: float = 0.0
    market_cap: int = 0


class StockSearchResult(BaseModel):
    """A single search result."""
    ticker: str
    name: str
    type: str = ""
    primary_exchange: str = ""


class StockSearchResponse(BaseModel):
    """Search results response."""
    results: list[StockSearchResult]
    count: int


class OHLCVPoint(BaseModel):
    """A single OHLCV data point for charting."""
    time: int  # Unix timestamp
    open: float
    high: float
    low: float
    close: float
    volume: int


class IndicatorPoint(BaseModel):
    """A single indicator data point."""
    time: int
    value: float


class IndicatorResponse(BaseModel):
    """Technical indicator response (varies by type)."""
    ticker: str
    indicator: str
    period: str
    data: list[IndicatorPoint] | dict


class CompanyInfo(BaseModel):
    """Company fundamental information."""
    ticker: str
    name: str = ""
    sector: str = ""
    industry: str = ""
    description: str = ""
    website: str = ""
    market_cap: int = 0
    employees: int = 0
    country: str = ""
    exchange: str = ""


class NewsArticle(BaseModel):
    """A news article."""
    title: str
    url: str
    source: str = ""
    summary: str = ""
    image: str = ""
    published_at: str = ""


class BatchQuoteResponse(BaseModel):
    """Response for batch quote requests."""
    quotes: dict[str, StockQuote]
