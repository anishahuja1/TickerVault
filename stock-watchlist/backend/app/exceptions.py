"""
TickerVault — Domain Exceptions.

These are business-logic exceptions that are NOT coupled to HTTP.
A global exception handler in main.py maps them to HTTP status codes.
"""


class TickerVaultError(Exception):
    """Base exception for all TickerVault domain errors."""

    def __init__(self, message: str = "An unexpected error occurred"):
        self.message = message
        super().__init__(self.message)


# ── Authentication ────────────────────────────────────────────────────────


class UserAlreadyExistsError(TickerVaultError):
    def __init__(self, field: str = "username"):
        super().__init__(f"A user with this {field} already exists")


class InvalidCredentialsError(TickerVaultError):
    def __init__(self):
        super().__init__("Invalid username or password")


class WeakPasswordError(TickerVaultError):
    def __init__(self, reason: str = "Password does not meet requirements"):
        super().__init__(reason)


# ── Stock Data ────────────────────────────────────────────────────────────


class TickerNotFoundError(TickerVaultError):
    def __init__(self, ticker: str):
        super().__init__(f"Ticker '{ticker}' not found or invalid")


class StockDataUnavailableError(TickerVaultError):
    def __init__(self, ticker: str = ""):
        msg = f"Stock data temporarily unavailable for '{ticker}'" if ticker else "Stock data service temporarily unavailable"
        super().__init__(msg)


# ── Watchlist ─────────────────────────────────────────────────────────────


class DuplicateWatchlistError(TickerVaultError):
    def __init__(self, ticker: str):
        super().__init__(f"'{ticker}' is already in your watchlist")


class WatchlistLimitError(TickerVaultError):
    def __init__(self, limit: int):
        super().__init__(f"Watchlist limit reached ({limit} items maximum)")


# ── Alerts ────────────────────────────────────────────────────────────────


class AlertLimitExceededError(TickerVaultError):
    def __init__(self, limit: int):
        super().__init__(f"Alert limit reached ({limit} alerts maximum)")


class AlertNotFoundError(TickerVaultError):
    def __init__(self, alert_id: int):
        super().__init__(f"Alert #{alert_id} not found")


# ── Portfolio ─────────────────────────────────────────────────────────────


class InsufficientSharesError(TickerVaultError):
    def __init__(self, ticker: str, available: float, requested: float):
        super().__init__(
            f"Cannot sell {requested} shares of {ticker} — only {available} shares held"
        )


class PortfolioLimitError(TickerVaultError):
    def __init__(self, limit: int):
        super().__init__(f"Transaction limit reached ({limit} transactions maximum)")
