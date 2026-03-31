"""TickerVault — API v1 Router."""

from fastapi import APIRouter

from .auth import router as auth_router
from .watchlist import router as watchlist_router
from .stocks import router as stocks_router
from .alerts import router as alerts_router
from .portfolio import router as portfolio_router

v1_router = APIRouter(prefix="/api/v1")

v1_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
v1_router.include_router(watchlist_router, prefix="/watchlist", tags=["Watchlist"])
v1_router.include_router(stocks_router, prefix="/stocks", tags=["Stocks"])
v1_router.include_router(alerts_router, prefix="/alerts", tags=["Alerts"])
v1_router.include_router(portfolio_router, prefix="/portfolio", tags=["Portfolio"])
