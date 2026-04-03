"""
TickerVault — Authentication Endpoints.

POST /api/v1/auth/register — Create a new account
POST /api/v1/auth/login    — Login and get JWT token
GET  /api/v1/auth/me       — Get current user profile
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.dependencies import get_current_user, get_db
from ...models.user import User
from ...schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse
from ...services.auth_service import AuthService

from sqlalchemy.exc import IntegrityError, OperationalError
from ...repositories.user_repository import UserRepository
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Register a new user account.
    Returns a JWT token on success — the user is immediately logged in.
    """
    try:
        repo = UserRepository(db)
        
        # Check username uniqueness (explicitly for diagnostic transparency)
        if await repo.get_by_username(data.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken. Please choose a different one."
            )

        # Check email uniqueness (explicitly for diagnostic transparency)
        if await repo.get_by_email(data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered. Please sign in instead."
            )

        service = AuthService(db)
        response = await service.register(
            username=data.username,
            email=data.email,
            password=data.password,
        )
        await db.commit()
        return response

    except HTTPException:
        raise

    except IntegrityError as e:
        await db.rollback()
        logger.error(f"DB IntegrityError on register: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists."
        )

    except OperationalError as e:
        await db.rollback()
        logger.error(f"DB OperationalError on register: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection error. Please try again in a moment."
        )

    except ValueError as e:
        logger.error(f"ValueError on register: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    except Exception as e:
        # Catch all unexpected errors — log them but return clean message
        await db.rollback()
        logger.error(f"Unexpected error on register: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
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
