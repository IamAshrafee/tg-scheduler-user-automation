from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr

from app.models.user import User, UserCreate
from app.services.user_service import user_service
from app.utils.security import verify_password, create_access_token
from app.middleware.deps import get_current_active_user
from app.middleware.rate_limiter import limiter
from app.config import get_settings

router = APIRouter()
settings = get_settings()

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/hour")
async def register(request: Request, user_in: UserCreate):
    """
    Register a new user.
    """
    user = await user_service.create(user_in)
    if not user:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Email already registered"
        )
    return user

@router.post("/login", response_model=Token)
@limiter.limit("5/15minutes")
async def login(request: Request, login_data: LoginRequest):
    """
    Login with email and password to get JWT token.
    """
    user = await user_service.get_by_email(login_data.email)
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=User)
async def read_users_me(current_user: Annotated[User, Depends(get_current_active_user)]):
    """
    Get current logged in user details.
    """
    return current_user
