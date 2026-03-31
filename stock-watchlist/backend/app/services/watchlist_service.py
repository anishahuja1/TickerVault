"""
TickerVault — Watchlist Service.
"""

import csv
import io
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..exceptions import DuplicateWatchlistError, WatchlistLimitError
from ..repositories.watchlist_repository import WatchlistRepository
from ..schemas.watchlist import WatchlistItemResponse, WatchlistResponse
from .stock_service import StockService


class WatchlistService:
    """Business logic for watchlist operations."""

    def __init__(self, db: AsyncSession):
        self.repo = WatchlistRepository(db)
        self.stock_service = StockService()
        self.settings = get_settings()

    async def get_watchlist(self, user_id: int) -> WatchlistResponse:
        """Get the user's full watchlist."""
        items = await self.repo.get_all(user_id)
        return WatchlistResponse(
            items=[WatchlistItemResponse.model_validate(i) for i in items],
            count=len(items),
        )

    async def add_ticker(
        self,
        user_id: int,
        ticker: str,
        company_name: str = "",
        notes: str | None = None,
    ) -> WatchlistItemResponse:
        """
        Add a ticker to the user's watchlist.

        Validates:
        - Ticker doesn't already exist in watchlist
        - Watchlist limit not exceeded
        - Auto-fetches company name if not provided
        """
        ticker = ticker.upper()

        # Check for duplicates
        existing = await self.repo.get_by_ticker(user_id, ticker)
        if existing:
            raise DuplicateWatchlistError(ticker)

        # Check limit
        count = await self.repo.count(user_id)
        if count >= self.settings.MAX_WATCHLIST_ITEMS:
            raise WatchlistLimitError(self.settings.MAX_WATCHLIST_ITEMS)

        # Auto-fetch company name if not provided
        if not company_name:
            try:
                info = await self.stock_service.get_company_info(ticker)
                company_name = info.get("name", ticker)
            except Exception:
                company_name = ticker

        item = await self.repo.create(
            user_id=user_id,
            ticker=ticker,
            company_name=company_name,
            notes=notes,
        )
        return WatchlistItemResponse.model_validate(item)

    async def remove_ticker(self, user_id: int, ticker: str) -> bool:
        """Remove a ticker from the watchlist."""
        return await self.repo.delete(user_id, ticker.upper())

    async def export_csv(self, user_id: int) -> str:
        """
        Export watchlist as CSV with current prices.
        Returns CSV string content.
        """
        items = await self.repo.get_all(user_id)
        if not items:
            return ""

        # Fetch current prices
        tickers = [item.ticker for item in items]
        quotes = await self.stock_service.get_batch_quotes(tickers)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            ["Ticker", "Company", "Price", "Change", "Change%", "Volume", "Added"]
        )

        for item in items:
            quote = quotes.get(item.ticker, {})
            writer.writerow(
                [
                    item.ticker,
                    item.company_name,
                    quote.get("price", "N/A"),
                    quote.get("change", "N/A"),
                    quote.get("change_percent", "N/A"),
                    quote.get("volume", "N/A"),
                    item.added_at.strftime("%Y-%m-%d"),
                ]
            )

        return output.getvalue()
