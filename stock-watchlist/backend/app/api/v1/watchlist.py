"""
TickerVault — Watchlist Endpoints.

GET    /api/v1/watchlist         — Get user's watchlist
POST   /api/v1/watchlist         — Add ticker to watchlist
DELETE /api/v1/watchlist/{ticker} — Remove ticker from watchlist
GET    /api/v1/watchlist/export  — Download watchlist as CSV
"""

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.dependencies import get_current_user, get_db
from ...models.user import User
from ...schemas.watchlist import WatchlistAdd, WatchlistItemResponse, WatchlistResponse
from ...services.watchlist_service import WatchlistService

router = APIRouter()


@router.get("", response_model=WatchlistResponse)
async def get_watchlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the authenticated user's full watchlist."""
    service = WatchlistService(db)
    return await service.get_watchlist(current_user.id)


@router.post("", response_model=WatchlistItemResponse, status_code=201)
async def add_to_watchlist(
    data: WatchlistAdd,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a ticker to the user's watchlist."""
    service = WatchlistService(db)
    return await service.add_ticker(
        user_id=current_user.id,
        ticker=data.ticker,
        company_name=data.company_name,
        notes=data.notes,
    )


@router.delete("/{ticker}")
async def remove_from_watchlist(
    ticker: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a ticker from the user's watchlist."""
    service = WatchlistService(db)
    await service.remove_ticker(current_user.id, ticker)
    return {"message": f"{ticker.upper()} removed from watchlist"}


@router.get("/export")
async def export_watchlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download the watchlist as a CSV file."""
    service = WatchlistService(db)
    csv_content = await service.export_csv(current_user.id)

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=watchlist.csv"},
    )
