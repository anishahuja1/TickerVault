"""
TickerVault — Portfolio Repository.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.portfolio import PortfolioTransaction


class PortfolioRepository:
    """Handles all database operations for PortfolioTransaction entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: int,
        ticker: str,
        company_name: str,
        transaction_type: str,
        quantity: float,
        price_per_share: float,
        notes: str | None = None,
        transacted_at=None,
    ) -> PortfolioTransaction:
        """Record a new buy/sell transaction."""
        txn = PortfolioTransaction(
            user_id=user_id,
            ticker=ticker.upper(),
            company_name=company_name,
            transaction_type=transaction_type,
            quantity=quantity,
            price_per_share=price_per_share,
            notes=notes,
        )
        if transacted_at:
            txn.transacted_at = transacted_at
        self.db.add(txn)
        await self.db.flush()
        return txn

    async def get_all(self, user_id: int) -> list[PortfolioTransaction]:
        """Get all transactions for a user, newest first."""
        stmt = (
            select(PortfolioTransaction)
            .where(PortfolioTransaction.user_id == user_id)
            .order_by(PortfolioTransaction.transacted_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_ticker(
        self, user_id: int, ticker: str
    ) -> list[PortfolioTransaction]:
        """Get all transactions for a specific ticker."""
        stmt = (
            select(PortfolioTransaction)
            .where(
                PortfolioTransaction.user_id == user_id,
                PortfolioTransaction.ticker == ticker.upper(),
            )
            .order_by(PortfolioTransaction.transacted_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_distinct_tickers(self, user_id: int) -> list[str]:
        """Get all unique tickers in a user's portfolio."""
        stmt = (
            select(PortfolioTransaction.ticker)
            .where(PortfolioTransaction.user_id == user_id)
            .distinct()
        )
        result = await self.db.execute(stmt)
        return [row[0] for row in result.all()]

    async def count(self, user_id: int) -> int:
        """Count total transactions for a user."""
        stmt = select(func.count()).where(
            PortfolioTransaction.user_id == user_id
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0
