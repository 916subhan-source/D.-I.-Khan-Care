"""
Authentication endpoints:
- Staff Login (Doctor, Assistant, Admin) with Argon2 verification and JWT issue
- Token Refresh
- Current user info
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.core.deps import get_current_user
from app.models import User, DoctorAssistant
from app.schemas import LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate Doctor, Assistant, or Admin using Argon2 password verification."""
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended or inactive."
        )

    # For ASSISTANT: Check that they have at least one active clinic link
    if user.role == "ASSISTANT":
        active_links = await db.execute(
            select(DoctorAssistant).where(
                and_(
                    DoctorAssistant.assistant_user_id == user.id,
                    DoctorAssistant.status == "active"
                )
            )
        )
        if not active_links.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your assistant access has been revoked by the clinic doctor. You can no longer log in."
            )

    # Portal-specific role enforcement: prevent assistant credentials from logging into Doctor Portal
    if credentials.portal:
        expected = credentials.portal.strip().upper()
        if expected == "DOCTOR" and user.role != "DOCTOR":
            if user.role == "ASSISTANT":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Assistant credentials cannot be used to access the Doctor Portal. Please sign in via the Assistant Reception Desk."
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: This portal is exclusively for verified medical doctors. Your account role is {user.role}."
            )
        elif expected == "ASSISTANT" and user.role not in ["ASSISTANT", "ADMIN"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: This portal is exclusively for clinic receptionists and assistants."
            )
        elif expected == "ADMIN" and user.role != "ADMIN":
            if user.role == "DOCTOR":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Doctor credentials cannot be used to access the Admin Portal. System administrator privileges required."
                )
            elif user.role == "ASSISTANT":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied: Assistant credentials cannot be used to access the Admin Portal. System administrator privileges required."
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: System administrator privileges required. Your account role is {user.role}."
                )

    import hashlib
    pwd_sig = hashlib.sha256(user.password_hash.encode()).hexdigest()[:16] if user.password_hash else "none"
    access_token = create_access_token(data={
        "sub": user.id,
        "role": user.role,
        "email": user.email,
        "pwd_sig": pwd_sig
    })
    refresh_token = create_refresh_token(data={"sub": user.id})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve details for current authenticated session."""
    return current_user
