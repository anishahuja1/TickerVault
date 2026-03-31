"""
TickerVault — Authentication Service.

Handles user registration, login, and token management.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from ..core.security import (
    create_access_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from ..exceptions import InvalidCredentialsError, UserAlreadyExistsError, WeakPasswordError
from ..repositories.user_repository import UserRepository
from ..schemas.user import TokenResponse, UserResponse


class AuthService:
    """Business logic for authentication operations."""

    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)

    async def register(
        self, username: str, email: str, password: str
    ) -> TokenResponse:
        """
        Register a new user account.

        1. Validate password strength
        2. Check username/email uniqueness
        3. Hash password and create user
        4. Return JWT token
        """
        # Validate password
        is_valid, error_msg = validate_password_strength(password)
        if not is_valid:
            raise WeakPasswordError(error_msg)

        # Check uniqueness
        if await self.repo.get_by_username(username):
            raise UserAlreadyExistsError("username")
        if await self.repo.get_by_email(email):
            raise UserAlreadyExistsError("email")

        # Create user
        hashed = hash_password(password)
        user = await self.repo.create(
            username=username,
            email=email,
            hashed_password=hashed,
        )

        # Generate token
        token = create_access_token({"sub": str(user.id)})
        user_response = UserResponse.model_validate(user)

        return TokenResponse(
            access_token=token,
            user=user_response,
        )

    async def login(self, username: str, password: str) -> TokenResponse:
        """
        Authenticate a user and return a JWT token.
        """
        user = await self.repo.get_by_username(username)
        if not user or not verify_password(password, user.hashed_password):
            raise InvalidCredentialsError()

        token = create_access_token({"sub": str(user.id)})
        user_response = UserResponse.model_validate(user)

        return TokenResponse(
            access_token=token,
            user=user_response,
        )

    async def get_profile(self, user_id: int) -> UserResponse:
        """Get user profile by ID."""
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise InvalidCredentialsError()
        return UserResponse.model_validate(user)

from jose import JWTError, jwt
from ..config import get_settings

def decode_token(token: str) -> str:
    """Decode JWT and return subject (id). Raises ValueError if invalid."""
    try:
        settings = get_settings()
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        sub: str = payload.get("sub")
        if sub is None:
            raise ValueError("Token has no subject")
        return sub
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")
