"""
TickerVault — Portfolio Transaction Model.

Stores buy/sell transactions for portfolio tracking.
Holdings are computed from the aggregate of all transactions per ticker.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base


class PortfolioTransaction(Base):
    __tablename__ = "portfolio_transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    ticker: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(255), default="")
    transaction_type: Mapped[str] = mapped_column(
        String(4), nullable=False
    )  # "buy" or "sell"
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    price_per_share: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    transacted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # ── Relationship ──────────────────────────────────────────────────────
    user = relationship("User", back_populates="portfolio_transactions")

    @property
    def total_amount(self) -> float:
        """Computed total: quantity × price_per_share."""
        return round(self.quantity * self.price_per_share, 2)

    def __repr__(self) -> str:
        return (
            f"<PortfolioTransaction({self.transaction_type.upper()} "
            f"{self.quantity}x {self.ticker} @ ${self.price_per_share})>"
        )
