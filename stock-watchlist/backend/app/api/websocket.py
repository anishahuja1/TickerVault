from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from ..services.auth_service import decode_token
from ..services.stock_service import StockService
from ..database import async_session_factory
from sqlalchemy import select
import asyncio
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])

async def get_user_tickers_by_id(db, user_id: int):
    """Helper: get tickers for a user identified by id."""
    from ..models.watchlist import WatchlistItem
    result = await db.execute(
        select(WatchlistItem).where(WatchlistItem.user_id == user_id)
    )
    items = result.scalars().all()
    return [item.ticker for item in items]

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
            else:
                # Send heartbeat so client knows connection is alive
                await websocket.send_json({"type": "heartbeat"})

            await asyncio.sleep(10)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {user_id}: {e}")
