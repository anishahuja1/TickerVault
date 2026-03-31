"""
TickerVault — Portfolio Endpoints.

GET  /api/v1/portfolio              — Get portfolio summary with P&L
POST /api/v1/portfolio/transactions — Add a buy/sell transaction
GET  /api/v1/portfolio/transactions — Get transaction history
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.dependencies import get_current_user, get_db
from ...models.user import User
from ...schemas.portfolio import (
    PortfolioSummary,
    TransactionCreate,
    TransactionListResponse,
    TransactionResponse,
)
from ...services.portfolio_service import PortfolioService

router = APIRouter()


@router.get("", response_model=PortfolioSummary)
async def get_portfolio(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the full portfolio summary.

    Computes holdings, current values, and P&L using live market data.
    """
    service = PortfolioService(db)
    return await service.get_portfolio_summary(current_user.id)


@router.post("/transactions", response_model=TransactionResponse, status_code=201)
async def add_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Record a buy or sell transaction.

    For sell transactions, validates that the user holds enough shares.
    """
    service = PortfolioService(db)
    return await service.add_transaction(
        user_id=current_user.id,
        ticker=data.ticker,
        company_name=data.company_name,
        transaction_type=data.transaction_type,
        quantity=data.quantity,
        price_per_share=data.price_per_share,
        notes=data.notes,
        transacted_at=data.transacted_at,
    )


@router.get("/transactions", response_model=TransactionListResponse)
async def get_transactions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the user's full transaction history."""
    service = PortfolioService(db)
    return await service.get_transactions(current_user.id)
