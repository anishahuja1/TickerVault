"""
TickerVault — Alert Endpoints.

GET    /api/v1/alerts             — Get user's alerts
POST   /api/v1/alerts             — Create a price alert
DELETE /api/v1/alerts/{alert_id}  — Delete an alert
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.dependencies import get_current_user, get_db
from ...models.user import User
from ...schemas.alert import AlertCreate, AlertListResponse, AlertResponse
from ...services.alert_service import AlertService

router = APIRouter()


@router.get("", response_model=AlertListResponse)
async def get_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all price alerts for the authenticated user."""
    service = AlertService(db)
    return await service.get_alerts(current_user.id)


@router.post("", response_model=AlertResponse, status_code=201)
async def create_alert(
    data: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new price alert."""
    service = AlertService(db)
    return await service.create_alert(
        user_id=current_user.id,
        ticker=data.ticker,
        target_price=data.target_price,
        condition=data.condition,
    )


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a price alert."""
    service = AlertService(db)
    await service.delete_alert(current_user.id, alert_id)
    return {"message": "Alert deleted"}
