"""
TickerVault — Portfolio Schemas.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    """Schema for recording a buy/sell transaction."""
    ticker: str = Field(..., min_length=1, max_length=10)
    company_name: str = Field(default="", max_length=255)
    transaction_type: str = Field(..., pattern=r"^(buy|sell)$")
    quantity: float = Field(..., gt=0)
    price_per_share: float = Field(..., gt=0)
    notes: str | None = Field(default=None, max_length=500)
    transacted_at: datetime | None = None  # Defaults to now


class TransactionResponse(BaseModel):
    """Schema for a single transaction."""
    id: int
    ticker: str
    company_name: str
    transaction_type: str
    quantity: float
    price_per_share: float
    total_amount: float
    notes: str | None
    transacted_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class HoldingResponse(BaseModel):
    """Computed holding for a single ticker."""
    ticker: str
    company_name: str
    total_shares: float
    avg_cost: float
    total_invested: float
    current_price: float = 0.0
    current_value: float = 0.0
    unrealized_pnl: float = 0.0
    unrealized_pnl_percent: float = 0.0
    day_change: float = 0.0
    day_change_percent: float = 0.0
    allocation_percent: float = 0.0


class PortfolioSummary(BaseModel):
    """Overall portfolio summary."""
    total_invested: float
    current_value: float
    total_pnl: float
    total_pnl_percent: float
    holdings: list[HoldingResponse]
    holdings_count: int
    transactions_count: int


class TransactionListResponse(BaseModel):
    """List of transactions."""
    transactions: list[TransactionResponse]
    count: int
