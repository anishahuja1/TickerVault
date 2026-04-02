"""
TickerVault — FastAPI Application.

Production-grade application factory with:
- CORS middleware
- Request logging
- Global exception handling
- Lifespan events (startup/shutdown)
- Health check endpoint
- Auto-generated Swagger docs
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.v1 import v1_router
from .api.websocket import router as ws_router
from .config import get_settings
from .core.middleware import RequestLoggingMiddleware
from .database import close_db, init_db
from .exceptions import (
    AlertLimitExceededError,
    AlertNotFoundError,
    DuplicateWatchlistError,
    InsufficientSharesError,
    InvalidCredentialsError,
    PortfolioLimitError,
    StockDataUnavailableError,
    TickerNotFoundError,
    TickerVaultError,
    UserAlreadyExistsError,
    WatchlistLimitError,
    WeakPasswordError,
)

# ── Logging ───────────────────────────────────────────────────────────────

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("tickervault")


# ── Lifespan ──────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Import models so Base.metadata sees all tables
    from .models import User, WatchlistItem, PriceAlert, PortfolioTransaction  # noqa

    logger.info("🚀 Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    await init_db()
    logger.info("✅ Database initialized")
    yield
    await close_db()
    logger.info("👋 Shutdown complete")


# ── App Factory ───────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Industry-grade stock watchlist & analytics API. "
        "Features real-time streaming, technical indicators, "
        "portfolio tracking, and price alerts."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Get frontend URL from env, default to production
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://ticker-vault.vercel.app")


# ── Middleware ────────────────────────────────────────────────────────────

# Add RequestLoggingMiddleware FIRST so it runs AFTER CORSMiddleware
app.add_middleware(RequestLoggingMiddleware)

# Add CORSMiddleware LAST so it wraps the entire app, running the outermost
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ticker-vault.vercel.app",
        "https://tickervault.vercel.app",
        FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ],
    allow_origin_regex=r"https://ticker-vault-.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ── CORS Preflight Safety Net ─────────────────────────────────────────────

@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str, request: Request):
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all for internal server errors.
    CRITICAL: Adds CORS headers so the error is visible to the frontend.
    """
    logging.error(f"Internal Server Error: {str(exc)}", exc_info=True)
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "msg": str(exc)},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
        }
    )


# ── Global Exception Handlers ────────────────────────────────────────────
# Maps domain exceptions → HTTP status codes (decoupled architecture)

EXCEPTION_STATUS_MAP = {
    UserAlreadyExistsError: status.HTTP_409_CONFLICT,
    InvalidCredentialsError: status.HTTP_401_UNAUTHORIZED,
    WeakPasswordError: status.HTTP_422_UNPROCESSABLE_ENTITY,
    TickerNotFoundError: status.HTTP_404_NOT_FOUND,
    StockDataUnavailableError: status.HTTP_503_SERVICE_UNAVAILABLE,
    DuplicateWatchlistError: status.HTTP_409_CONFLICT,
    WatchlistLimitError: status.HTTP_429_TOO_MANY_REQUESTS,
    AlertLimitExceededError: status.HTTP_429_TOO_MANY_REQUESTS,
    AlertNotFoundError: status.HTTP_404_NOT_FOUND,
    InsufficientSharesError: status.HTTP_422_UNPROCESSABLE_ENTITY,
    PortfolioLimitError: status.HTTP_429_TOO_MANY_REQUESTS,
}


@app.exception_handler(TickerVaultError)
async def tickervault_exception_handler(request: Request, exc: TickerVaultError):
    """Convert domain exceptions to HTTP responses."""
    status_code = EXCEPTION_STATUS_MAP.get(
        type(exc), status.HTTP_500_INTERNAL_SERVER_ERROR
    )
    return JSONResponse(
        status_code=status_code,
        content={"detail": exc.message},
    )


# ── Routers ───────────────────────────────────────────────────────────────

app.include_router(v1_router)
app.include_router(ws_router)


# ── Health Check ──────────────────────────────────────────────────────────


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
