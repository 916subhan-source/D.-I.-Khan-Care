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
    async def issue_verification_code(
        cls,
        contact: str,
        whatsapp_number: Optional[str] = None,
        patient_name: Optional[str] = None,
        doctor_name: Optional[str] = None,
        slot_time: Optional[str] = None
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Issues a new 6-digit code for a patient and dispatches it via WhatsApp.
        Enforces 3 attempts / 15-minute sliding-window rate limit.
        Returns: (success: bool, message: str, plain_code_for_dev: Optional[str])
        """
        import re
        clean_contact = re.sub(r"\D", "", contact) if contact else contact
        target_phone = (whatsapp_number or contact or "").strip()

        # 1. Check rate limit
        within_limit = await redis_manager.check_and_increment_rate_limit(
            contact=clean_contact or contact,
            max_attempts=settings.MAX_OTP_ATTEMPTS,
            window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS
        )
        if not within_limit:
            return False, "Rate limit exceeded. Maximum 3 attempts allowed per 15 minutes. Please try again later.", None

        # 2. Reset any previous failed verification attempts for this contact
        await redis_manager.reset_verify_attempts(contact)
        if clean_contact and clean_contact != contact:
            await redis_manager.reset_verify_attempts(clean_contact)

        # 3. Generate 6-digit code and Argon2 hash
        plain_code = cls.generate_6digit_code()
        hashed_code = hash_otp_code(plain_code)

        # 4. Store in Redis with 10-minute TTL under both raw and cleaned formats
        await redis_manager.set_otp(contact, hashed_code, ttl_seconds=settings.OTP_TTL_SECONDS)
        if clean_contact and clean_contact != contact:
            await redis_manager.set_otp(clean_contact, hashed_code, ttl_seconds=settings.OTP_TTL_SECONDS)
        logger.info(f"Generated 6-digit OTP for {contact} (Dev code: {plain_code})")

        # 5. Send via WhatsApp (Evolution API v2)
        salutation = f" {patient_name.strip()}" if (patient_name and patient_name.strip()) else ""
        doc_line = f"\n👨‍⚕️ *Doctor:* {doctor_name.strip()}" if (doctor_name and doctor_name.strip()) else ""
        slot_line = f"\n📅 *Slot:* {slot_time.strip()}" if (slot_time and slot_time.strip()) else ""

        wa_message = (
            f"🏥 *D.I. Khan Care — Clinic Verification Code*\n\n"
            f"Assalam-o-Alaikum{salutation},\n"
            f"Aapki doctor appointment verification ka 6-digit verification code yeh hai:\n\n"
            f"🔐 *{plain_code}*\n"
            f"{doc_line}{slot_line}\n\n"
            f"⏱️ Yeh code *10 minute* tak valid hai.\n"
            f"⚠️ Yeh code kisi ke sath share na karein.\n\n"
            f"Appointment confirm karne ke liye yeh code website par enter karein.\n"
            f"🌐 https://dikhancare.io"
        )

        try:
            from app.services.notification_service import notification_service
            wa_sent = await notification_service.send_whatsapp(target_phone, wa_message)
            if wa_sent:
                logger.info(f"[OTP WhatsApp SUCCESS] 6-digit OTP code dispatched to {target_phone}")
            else:
                logger.warning(f"[OTP WhatsApp WARNING] Failed to deliver WhatsApp OTP to {target_phone}")
        except Exception as e:
            logger.error(f"[OTP WhatsApp ERROR] Exception during WhatsApp OTP dispatch to {target_phone}: {e}")

        # In dev mode, return plain code so UI displays toast/banner
        code_preview = plain_code if settings.DEBUG or settings.ENVIRONMENT == "development" else None
        return True, "6-digit verification code has been sent to your WhatsApp.", code_preview

    @classmethod
    async def verify_code(cls, contact: str, code: str) -> Tuple[bool, str]:
        """
        Verifies the patient's 6-digit code against Redis.
        Strictly enforces maximum failed verification attempts (max 5) to block brute-force attacks.
        Deletes code upon successful verification or when max attempts are reached.
        """
        import re
        clean_contact = re.sub(r"\D", "", contact) if contact else contact
        stored_hash = await redis_manager.get_otp(contact)
        if not stored_hash and clean_contact and clean_contact != contact:
            stored_hash = await redis_manager.get_otp(clean_contact)

        if not stored_hash:
            return False, "Verification code has expired or was not requested. Please request a new code."

        max_verify = getattr(settings, "MAX_OTP_VERIFY_ATTEMPTS", 5)

        # 1. Check if verification attempts have already been exhausted
        current_attempts = await redis_manager.get_verify_attempts(contact)
        if current_attempts >= max_verify:
            await redis_manager.delete_otp(contact)
            if clean_contact:
                await redis_manager.delete_otp(clean_contact)
            return False, "Too many incorrect verification attempts. This verification code has been invalidated for security. Please request a new code."

        # 2. Check code validity
        is_valid = verify_otp_code(code, stored_hash)
        if not is_valid:
            new_attempts = await redis_manager.increment_verify_attempts(contact, ttl_seconds=settings.OTP_TTL_SECONDS)
            if new_attempts >= max_verify:
                await redis_manager.delete_otp(contact)
                if clean_contact:
                    await redis_manager.delete_otp(clean_contact)
                return False, "Too many incorrect verification attempts. This verification code has been invalidated for security. Please request a new code."

            remaining = max_verify - new_attempts
            attempt_word = "attempt" if remaining == 1 else "attempts"
            return False, f"Invalid 6-digit verification code. {remaining} {attempt_word} remaining."

        # 3. Code is valid -> consume it immediately and clear verify counter
        await redis_manager.delete_otp(contact)
        if clean_contact:
            await redis_manager.delete_otp(clean_contact)
        await redis_manager.reset_verify_attempts(contact)
        if clean_contact:
            await redis_manager.reset_verify_attempts(clean_contact)
        return True, "Verification successful."

otp_service = OTPService()
