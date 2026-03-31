"""
TickerVault — Authentication Endpoints.

POST /api/v1/auth/register — Create a new account
POST /api/v1/auth/login    — Login and get JWT token
GET  /api/v1/auth/me       — Get current user profile
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.dependencies import get_current_user, get_db
from ...models.user import User
from ...schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse
from ...services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Register a new user account.

    Returns a JWT token on success — the user is immediately logged in.
    """
    service = AuthService(db)
    return await service.register(
        username=data.username,
        email=data.email,
        password=data.password,
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Authenticate and receive a JWT token.
    """
    service = AuthService(db)
    return await service.login(
        username=data.username,
        password=data.password,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get the currently authenticated user's profile.
    """
    return UserResponse.model_validate(current_user)
