"""
TickerVault — Price Alert Model.

Stores user-defined price alerts that trigger when a stock
crosses above or below a target price.
"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    ticker: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    target_price: Mapped[float] = mapped_column(Float, nullable=False)
    condition: Mapped[str] = mapped_column(
        String(10), nullable=False
    )  # "above" or "below"
    is_triggered: Mapped[bool] = mapped_column(Boolean, default=False)
    triggered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # ── Relationship ──────────────────────────────────────────────────────
    user = relationship("User", back_populates="alerts")

    def __repr__(self) -> str:
        return (
            f"<PriceAlert(ticker='{self.ticker}', "
            f"condition='{self.condition}', target={self.target_price})>"
        )
