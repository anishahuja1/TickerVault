"""
TickerVault — Watchlist Repository.
"""

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.watchlist import WatchlistItem


class WatchlistRepository:
    """Handles all database operations for WatchlistItem entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, user_id: int) -> list[WatchlistItem]:
        """Get all watchlist items for a user, ordered by added_at."""
        stmt = (
            select(WatchlistItem)
            .where(WatchlistItem.user_id == user_id)
            .order_by(WatchlistItem.added_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_ticker(self, user_id: int, ticker: str) -> WatchlistItem | None:
        """Get a specific watchlist item by ticker."""
        stmt = select(WatchlistItem).where(
            WatchlistItem.user_id == user_id,
            WatchlistItem.ticker == ticker.upper(),
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self,
        user_id: int,
        ticker: str,
        company_name: str = "",
        notes: str | None = None,
    ) -> WatchlistItem:
        """Add a ticker to watchlist."""
        item = WatchlistItem(
            user_id=user_id,
            ticker=ticker.upper(),
            company_name=company_name,
            notes=notes,
        )
        self.db.add(item)
        await self.db.flush()
        return item

    async def delete(self, user_id: int, ticker: str) -> bool:
        """Remove a ticker from watchlist. Returns True if deleted."""
        stmt = delete(WatchlistItem).where(
            WatchlistItem.user_id == user_id,
            WatchlistItem.ticker == ticker.upper(),
        )
        result = await self.db.execute(stmt)
        return result.rowcount > 0

    async def count(self, user_id: int) -> int:
        """Count how many items are in a user's watchlist."""
        stmt = select(func.count()).where(WatchlistItem.user_id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar() or 0
