"""
TickerVault — Watchlist Schemas.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class WatchlistAdd(BaseModel):
    """Schema for adding a ticker to watchlist."""
    ticker: str = Field(..., min_length=1, max_length=10)
    company_name: str = Field(default="", max_length=255)
    notes: str | None = Field(default=None, max_length=500)


class WatchlistItemResponse(BaseModel):
    """Schema for a single watchlist item."""
    id: int
    ticker: str
    company_name: str
    notes: str | None
    added_at: datetime

    model_config = {"from_attributes": True}


class WatchlistResponse(BaseModel):
    """Schema for the full watchlist response."""
    items: list[WatchlistItemResponse]
    count: int
