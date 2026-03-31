"""
TickerVault — Middleware.

Request logging and timing for observability.
"""

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("tickervault")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs every HTTP request with method, path, status code, and timing.
    Adds X-Process-Time header to all responses.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.monotonic()
        response = await call_next(request)
        elapsed = time.monotonic() - start

        # Skip logging for health checks and static files
        path = request.url.path
        if path not in ("/health", "/favicon.ico"):
            logger.info(
                "%s %s → %s (%.3fs)",
                request.method,
                path,
                response.status_code,
                elapsed,
            )

        response.headers["X-Process-Time"] = f"{elapsed:.3f}"
        return response
