"""
TickerVault — Alert Repository.
"""

from datetime import datetime, timezone

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.alert import PriceAlert


class AlertRepository:
    """Handles all database operations for PriceAlert entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, user_id: int) -> list[PriceAlert]:
        """Get all alerts for a user."""
        stmt = (
            select(PriceAlert)
            .where(PriceAlert.user_id == user_id)
            .order_by(PriceAlert.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_active(self, user_id: int | None = None) -> list[PriceAlert]:
        """Get all active (untriggered) alerts, optionally filtered by user."""
        stmt = select(PriceAlert).where(PriceAlert.is_triggered == False)  # noqa: E712
        if user_id is not None:
            stmt = stmt.where(PriceAlert.user_id == user_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(
        self,
        user_id: int,
        ticker: str,
        target_price: float,
        condition: str,
    ) -> PriceAlert:
        """Create a new price alert."""
        alert = PriceAlert(
            user_id=user_id,
            ticker=ticker.upper(),
            target_price=target_price,
            condition=condition,
        )
        self.db.add(alert)
        await self.db.flush()
        return alert

    async def mark_triggered(self, alert_id: int) -> None:
        """Mark an alert as triggered."""
        stmt = (
            update(PriceAlert)
            .where(PriceAlert.id == alert_id)
            .values(
                is_triggered=True,
                triggered_at=datetime.now(timezone.utc),
            )
        )
        await self.db.execute(stmt)

    async def delete(self, user_id: int, alert_id: int) -> bool:
        """Delete an alert. Returns True if deleted."""
        stmt = delete(PriceAlert).where(
            PriceAlert.id == alert_id,
            PriceAlert.user_id == user_id,
        )
        result = await self.db.execute(stmt)
        return result.rowcount > 0

    async def count(self, user_id: int) -> int:
        """Count a user's active alerts."""
        stmt = select(func.count()).where(
            PriceAlert.user_id == user_id,
            PriceAlert.is_triggered == False,  # noqa: E712
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0
