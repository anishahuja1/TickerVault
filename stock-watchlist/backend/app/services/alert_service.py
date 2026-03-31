"""
TickerVault — Alert Service.
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..exceptions import AlertLimitExceededError, AlertNotFoundError
from ..repositories.alert_repository import AlertRepository
from ..schemas.alert import AlertListResponse, AlertResponse

logger = logging.getLogger("tickervault.alerts")


class AlertService:
    """Business logic for price alert operations."""

    def __init__(self, db: AsyncSession):
        self.repo = AlertRepository(db)
        self.settings = get_settings()

    async def get_alerts(self, user_id: int) -> AlertListResponse:
        """Get all alerts for a user."""
        alerts = await self.repo.get_all(user_id)
        return AlertListResponse(
            alerts=[AlertResponse.model_validate(a) for a in alerts],
            count=len(alerts),
        )

    async def create_alert(
        self,
        user_id: int,
        ticker: str,
        target_price: float,
        condition: str,
    ) -> AlertResponse:
        """
        Create a new price alert.

        Validates:
        - Alert limit not exceeded
        - Condition is 'above' or 'below'
        """
        # Check limit
        count = await self.repo.count(user_id)
        if count >= self.settings.MAX_ALERTS_PER_USER:
            raise AlertLimitExceededError(self.settings.MAX_ALERTS_PER_USER)

        alert = await self.repo.create(
            user_id=user_id,
            ticker=ticker.upper(),
            target_price=target_price,
            condition=condition,
        )
        return AlertResponse.model_validate(alert)

    async def delete_alert(self, user_id: int, alert_id: int) -> bool:
        """Delete an alert."""
        deleted = await self.repo.delete(user_id, alert_id)
        if not deleted:
            raise AlertNotFoundError(alert_id)
        return True

    async def check_alerts(
        self, price_updates: dict[str, float]
    ) -> list[AlertResponse]:
        """
        Check all active alerts against current prices.
        Returns list of newly triggered alerts.

        Args:
            price_updates: {ticker: current_price}
        """
        triggered = []
        active_alerts = await self.repo.get_active()

        for alert in active_alerts:
            current_price = price_updates.get(alert.ticker)
            if current_price is None:
                continue

            should_trigger = False
            if alert.condition == "above" and current_price >= alert.target_price:
                should_trigger = True
            elif alert.condition == "below" and current_price <= alert.target_price:
                should_trigger = True

            if should_trigger:
                await self.repo.mark_triggered(alert.id)
                alert.is_triggered = True
                triggered.append(AlertResponse.model_validate(alert))
                logger.info(
                    "Alert triggered: %s %s $%.2f (current: $%.2f)",
                    alert.ticker,
                    alert.condition,
                    alert.target_price,
                    current_price,
                )

        return triggered
