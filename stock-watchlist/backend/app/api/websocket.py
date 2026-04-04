from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from ..services.auth_service import decode_token
from ..services.stock_service import StockService
from ..services.alert_service import AlertService
from ..database import async_session_factory
from sqlalchemy import select
import asyncio
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

async def get_user_tickers_by_id(db, user_id: int):
    """Helper: get unique tickers for a user from both watchlist and portfolio."""
    from ..models.watchlist import WatchlistItem
    from ..models.portfolio import PortfolioTransaction
    
    # Get watchlist tickers
    watchlist_result = await db.execute(
        select(WatchlistItem.ticker).where(WatchlistItem.user_id == user_id)
    )
    watchlist_tickers = watchlist_result.scalars().all()
    
    # Get portfolio tickers
    portfolio_result = await db.execute(
        select(PortfolioTransaction.ticker).where(PortfolioTransaction.user_id == user_id).distinct()
    )
    portfolio_tickers = portfolio_result.scalars().all()
    
    # Combine and deduplicate
    return list(set(watchlist_tickers) | set(portfolio_tickers))

@router.websocket("/api/v1/ws/prices")
async def websocket_prices(
    websocket: WebSocket,
    token: str = Query(...),
):
    # 1. Authenticate before accepting
    try:
        user_id_str = decode_token(token)
        user_id = int(user_id_str)
    except Exception as e:
        logger.error(f"WebSocket auth failed: {e}")
        await websocket.close(code=1008)  # Policy violation = bad auth
        return

    await websocket.accept()
    logger.info(f"WebSocket connected for user {user_id}")

    # Import the new global method
    from ..services.stock_service import get_stock_price

    try:
        while True:
            # Get user's current tickers fresh each cycle
            async with async_session_factory() as db:
                tickers = await get_user_tickers_by_id(db, user_id)

            if tickers:
                prices = []
                for t in tickers:
                    try:
                        # Wrap sync network call in threadpool to prevent blocking the async loop
                        data = await asyncio.to_thread(get_stock_price, t)
                        prices.append(data)
                    except Exception as e:
                        logger.warning(f"Could not fetch {t} for websocket: {e}")

                if prices:
                    await websocket.send_json({
                        "type": "price_update",
                        "data": prices
                    })
                    
                    # ── Alert Checking ─────────────────────────────────────
                    # Convert to {ticker: price} dict for alert service
                    price_map = {p["ticker"]: p["price"] for p in prices}
                    alert_service = AlertService(db)
                    triggered = await alert_service.check_alerts(price_map)
                    
                    for alert in triggered:
                        await websocket.send_json({
                            "type": "alert_triggered",
                            "data": alert.model_dump()
                        })
            else:
                # Send heartbeat so client knows connection is alive
                await websocket.send_json({"type": "heartbeat"})

            await asyncio.sleep(10)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {user_id}: {e}")
