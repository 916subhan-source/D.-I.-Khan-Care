"""
Security utilities:
- Argon2 password and code hashing (via passlib)
- JWT token creation and verification
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from passlib.context import CryptContext
from jose import jwt, JWTError
from app.core.config import settings

# Argon2 is the primary password hasher
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the Argon2 hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a password using Argon2."""
    return pwd_context.hash(password)

def hash_otp_code(code: str) -> str:
    """Hashes a 6-digit OTP code before storing in Redis."""
    return pwd_context.hash(code)

def verify_otp_code(plain_code: str, hashed_code: str) -> bool:
    """Verifies a 6-digit OTP code against the stored hash."""
    return pwd_context.verify(plain_code, hashed_code)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Creates a signed JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    """Decodes and validates a JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
