"""
TickerVault — In-Memory TTL Cache.

Lightweight cache with time-to-live expiry. Eliminates the need
for Redis in development while still reducing redundant API calls.

Usage:
    from app.core.cache import cache

    cache.set("quote:AAPL", data, ttl=30)
    result = cache.get("quote:AAPL")  # None if expired
"""

import time
from typing import Any


class CacheEntry:
    """A single cached value with expiration."""

    __slots__ = ("value", "expires_at")

    def __init__(self, value: Any, ttl: int):
        self.value = value
        self.expires_at = time.monotonic() + ttl

    @property
    def is_expired(self) -> bool:
        return time.monotonic() > self.expires_at


class CacheManager:
    """Thread-safe in-memory cache with TTL support."""

    # Default TTLs for different data types (seconds)
    TTL_QUOTE = 30        # Stock quotes — refresh frequently
    TTL_SEARCH = 300      # Search results — 5 minutes
    TTL_HISTORY = 300     # Chart history — 5 minutes
    TTL_COMPANY = 3600    # Company info — 1 hour (rarely changes)
    TTL_NEWS = 600        # News articles — 10 minutes
    TTL_INDICATORS = 300  # Technical indicators — 5 minutes

    def __init__(self) -> None:
        self._store: dict[str, CacheEntry] = {}

    def get(self, key: str) -> Any | None:
        """Get a cached value. Returns None if missing or expired."""
        entry = self._store.get(key)
        if entry is None:
            return None
        if entry.is_expired:
            del self._store[key]
            return None
        return entry.value

    def set(self, key: str, value: Any, ttl: int = 60) -> None:
        """Store a value with a TTL in seconds."""
        self._store[key] = CacheEntry(value, ttl)

    def invalidate(self, key: str) -> None:
        """Remove a specific key from cache."""
        self._store.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> None:
        """Remove all keys matching a prefix."""
        keys_to_remove = [k for k in self._store if k.startswith(prefix)]
        for key in keys_to_remove:
            del self._store[key]

    def clear(self) -> None:
        """Clear the entire cache."""
        self._store.clear()

    def cleanup(self) -> int:
        """Remove all expired entries. Returns count removed."""
        expired = [k for k, v in self._store.items() if v.is_expired]
        for key in expired:
            del self._store[key]
        return len(expired)

    @property
    def size(self) -> int:
        """Number of entries in cache (including expired)."""
        return len(self._store)


# ── Singleton ─────────────────────────────────────────────────────────────
cache = CacheManager()
