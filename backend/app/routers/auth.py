"""
Authentication endpoints:
- Staff Login (Doctor, Assistant, Admin) with Argon2 verification and JWT issue
- Token Refresh
- Current user info
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.core.deps import get_current_user
from app.core.redis import redis_manager
from app.models import User, DoctorAssistant
from app.schemas import LoginRequest, TokenResponse, UserResponse
from app.services.notification_service import notification_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    credentials: LoginRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate Doctor, Assistant, or Admin using Argon2 password verification with brute-force rate limiting."""
    clean_email = credentials.email.strip().lower()
    rate_key = f"rate_limit:login:{clean_email}"

    # Brute-force rate limiting: max 5 failed attempts in 15 minutes (900s)
    failed_attempts_str = await redis_manager.get(rate_key)
    failed_attempts = int(failed_attempts_str) if failed_attempts_str else 0
    if failed_attempts >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Account temporarily locked for 15 minutes to protect against brute-force attacks. Please try again later."
        )

    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(credentials.password, user.password_hash):
        await redis_manager.set(rate_key, str(failed_attempts + 1), expire=900)
        remaining = max(0, 5 - (failed_attempts + 1))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect email or password.{f' ({remaining} attempt(s) remaining before temporary lockout)' if remaining > 0 else ''}"
        )

    # Login succeeded: clear failed attempts
    if failed_attempts > 0:
        if not redis_manager._use_fallback and redis_manager.client:
            try:
                await redis_manager.client.delete(rate_key)
            except Exception:
                pass
        redis_manager._fallback_store.pop(rate_key, None)

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

    # Multi-Device Login Alert for Doctor
    if user.role == "DOCTOR":
        current_device_id = (credentials.device_id or "").strip()
        current_device_name = (credentials.device_name or "").strip()

        if not current_device_id:
            ua_header = request.headers.get("user-agent", "unknown_agent")
            ip_header = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "unknown_ip")
            current_device_id = f"dev_{hashlib.md5((ua_header + ip_header).encode()).hexdigest()[:12]}"

        if not current_device_name:
            current_device_name = request.headers.get("user-agent", "Web Browser")
            if len(current_device_name) > 60:
                current_device_name = current_device_name[:60] + "..."

        client_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "Unknown IP")
        if "," in client_ip:
            client_ip = client_ip.split(",")[0].strip()

        first_device_key = f"doctor:first_device:{user.id}"
        first_device_id = await redis_manager.get(first_device_key)

        if not first_device_id:
            # First device ever registered for this doctor: store as primary/first device
            await redis_manager.set(first_device_key, current_device_id, expire=31536000)
            await redis_manager.set(f"doctor:first_device_name:{user.id}", current_device_name, expire=31536000)
        else:
            # Check if doctor is logging in on ANOTHER device
            if current_device_id != first_device_id:
                background_tasks.add_task(
                    notification_service.notify_doctor_new_device_login,
                    doctor_user_id=user.id,
                    device_name=current_device_name,
                    client_ip=client_ip
                )

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
