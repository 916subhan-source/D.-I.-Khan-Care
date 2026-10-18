"""
Authentication and Role-Based Access Control dependencies.
"""

from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import decode_token
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Decodes JWT access token and yields current authenticated user."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")
    if user.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive or suspended")

    # Invalidate previous sessions if credentials (password or email) were changed by admin
    import hashlib
    token_pwd_sig = payload.get("pwd_sig")
    current_pwd_sig = hashlib.sha256(user.password_hash.encode()).hexdigest()[:16] if user.password_hash else "none"
    if token_pwd_sig and token_pwd_sig != current_pwd_sig:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your login credentials were changed by the administrator. Previous session suspended. Please log in with your new credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token_email = payload.get("email")
    if token_email and token_email.lower() != user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your login username/email was updated by the administrator. Previous session suspended. Please log in with your new credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

def require_roles(allowed_roles: List[str]):
    """Role-based access dependency factory."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker
