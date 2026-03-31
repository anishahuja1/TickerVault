"""
TickerVault — User Repository.

Pure data access layer for the users table.
No business logic — that belongs in the service layer.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.user import User


class UserRepository:
    """Handles all database operations for User entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, username: str, email: str, hashed_password: str) -> User:
        """Insert a new user."""
        user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
        )
        self.db.add(user)
        await self.db.flush()  # Assigns ID without committing
        return user

    async def get_by_id(self, user_id: int) -> User | None:
        """Fetch a user by primary key."""
        return await self.db.get(User, user_id)

    async def get_by_username(self, username: str) -> User | None:
        """Fetch a user by username (case-insensitive)."""
        stmt = select(User).where(User.username.ilike(username))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Fetch a user by email (case-insensitive)."""
        stmt = select(User).where(User.email.ilike(email))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
