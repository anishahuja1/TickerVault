"""
TickerVault — Alert Schemas.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class AlertCreate(BaseModel):
    """Schema for creating a price alert."""
    ticker: str = Field(..., min_length=1, max_length=10)
    target_price: float = Field(..., gt=0)
    condition: str = Field(..., pattern=r"^(above|below)$")


class AlertResponse(BaseModel):
    """Schema for a single alert."""
    id: int
    ticker: str
    target_price: float
    condition: str
    is_triggered: bool
    triggered_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    """Schema for list of alerts."""
    alerts: list[AlertResponse]
    count: int
