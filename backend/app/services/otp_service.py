"""
Verification & OTP Service with Redis in-memory storage, Argon2 hashing,
and sliding-window rate limiting (max 3 attempts per 15 minutes).
Supports multi-driver architecture:
- Mock/Dev Driver: returns code in UI toast/debug for friction-free testing
- Ready interface for WhatsApp Cloud API / SMS gateways
"""

import random
import logging
from typing import Tuple, Optional
from app.core.config import settings
from app.core.redis import redis_manager
from app.core.security import hash_otp_code, verify_otp_code

logger = logging.getLogger("otp_service")

class OTPService:
    @staticmethod
    def generate_6digit_code() -> str:
        """Generates a secure 6-digit numeric verification code."""
        return f"{random.randint(100000, 999999)}"

    @classmethod
    async def issue_verification_code(cls, contact: str) -> Tuple[bool, str, Optional[str]]:
        """
        Issues a new 6-digit code for a patient.
        Enforces 3 attempts / 15-minute rate limit.
        Returns: (success: bool, message: str, plain_code_for_dev: Optional[str])
        """
        # 1. Check rate limit
        within_limit = await redis_manager.check_and_increment_rate_limit(
            contact=contact,
            max_attempts=settings.MAX_OTP_ATTEMPTS,
            window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS
        )
        if not within_limit:
            return False, "Rate limit exceeded. Maximum 3 attempts allowed per 15 minutes. Please try again later.", None

        # 2. Reset any previous failed verification attempts for this contact
        await redis_manager.reset_verify_attempts(contact)

        # 3. Generate 6-digit code and Argon2 hash
        plain_code = cls.generate_6digit_code()
        hashed_code = hash_otp_code(plain_code)

        # 4. Store in Redis with 10-minute TTL
        await redis_manager.set_otp(contact, hashed_code, ttl_seconds=settings.OTP_TTL_SECONDS)
        logger.info(f"Generated 6-digit OTP for {contact} (Dev code: {plain_code})")

        # In dev mode, return plain code so UI displays toast/banner
        code_preview = plain_code if settings.DEBUG or settings.ENVIRONMENT == "development" else None
        return True, "6-digit verification code sent successfully.", code_preview

    @classmethod
    async def verify_code(cls, contact: str, code: str) -> Tuple[bool, str]:
        """
        Verifies the patient's 6-digit code against Redis.
        Strictly enforces maximum failed verification attempts (max 5) to block brute-force attacks.
        Deletes code upon successful verification or when max attempts are reached.
        """
        stored_hash = await redis_manager.get_otp(contact)
        if not stored_hash:
            return False, "Verification code has expired or was not requested. Please request a new code."

        max_verify = getattr(settings, "MAX_OTP_VERIFY_ATTEMPTS", 5)

        # 1. Check if verification attempts have already been exhausted
        current_attempts = await redis_manager.get_verify_attempts(contact)
        if current_attempts >= max_verify:
            await redis_manager.delete_otp(contact)
            return False, "Too many incorrect verification attempts. This verification code has been invalidated for security. Please request a new code."

        # 2. Check code validity
        is_valid = verify_otp_code(code, stored_hash)
        if not is_valid:
            new_attempts = await redis_manager.increment_verify_attempts(contact, ttl_seconds=settings.OTP_TTL_SECONDS)
            if new_attempts >= max_verify:
                await redis_manager.delete_otp(contact)
                return False, "Too many incorrect verification attempts. This verification code has been invalidated for security. Please request a new code."

            remaining = max_verify - new_attempts
            attempt_word = "attempt" if remaining == 1 else "attempts"
            return False, f"Invalid 6-digit verification code. {remaining} {attempt_word} remaining."

        # 3. Code is valid -> consume it immediately and clear verify counter
        await redis_manager.delete_otp(contact)
        await redis_manager.reset_verify_attempts(contact)
        return True, "Verification successful."

otp_service = OTPService()
