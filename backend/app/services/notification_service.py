"""
Notification Service for D.I. Khan Doctor Appointment System.
Supports:
1. Direct Gmail SMTP (via Google App Password: smtp.gmail.com:587)
2. Resend.com API (Transactional driver for instant delivery to Gmail)
3. Safe development console logger fallback

Handles:
- Event 1: New appointment request received -> Notify Assistant Gmail
- Event 2a: Assistant confirms/approves appointment -> Notify Assistant Gmail & Patient
- Event 2b: Assistant cancels/rejects appointment -> Notify Assistant Gmail & Patient
- Event 3: 1-hour reminder before booked appointment time -> Notify Assistant & Patient
- Event 4: Doctor marks consultation as COMPLETED -> Notify Assistant & Patient
"""

import smtplib
import ssl
import logging
import re
import urllib.parse
try:
    import httpx
except ImportError:
    httpx = None

try:
    import aiohttp
except ImportError:
    aiohttp = None
from email.message import EmailMessage
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid, formataddr
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.timezone import format_pkt_date, format_pkt_time, to_pkt, PKT
from app.models import Appointment, Doctor, User, DoctorSlot, DoctorAssistant
from app.services.wa_card_generator import (
    generate_otp_card,
    generate_request_sent_card,
    generate_request_received_card,
    generate_confirmed_card,
    generate_reminder_card,
    generate_rescheduled_card,
    generate_cancelled_card,
    generate_completed_card,
    clean_doctor_display_name
)

logger = logging.getLogger("notification_service")
logger.setLevel(logging.INFO)

class NotificationService:
    def __init__(self):
        self.evolution_url = (getattr(settings, "EVOLUTION_API_URL", None) or "http://76.13.18.85:32768").strip()
        self.evolution_key = (getattr(settings, "EVOLUTION_API_KEY", None) or "u8lzdSknWYziUvBemQX1hOBvTGGMSPkN").strip()
        self.evolution_instance = (getattr(settings, "EVOLUTION_INSTANCE_NAME", None) or "D. I. khan Care").strip()

        self.smtp_host = settings.SMTP_HOST or "smtp.gmail.com"
        self.smtp_port = settings.SMTP_PORT or 587
        self.gmail_user = (
            getattr(settings, "GMAIL_USER", None) or 
            getattr(settings, "SMTP_USER", None) or 
            ""
        ).strip()
        self.gmail_password = (
            getattr(settings, "GMAIL_APP_PASSWORD", None) or 
            getattr(settings, "SMTP_PASSWORD", None) or 
            ""
        ).strip().replace(" ", "")
        self.resend_key = (settings.RESEND_API_KEY or "").strip()
        self.sender_email = (
            self.gmail_user if self.gmail_user 
            else (settings.SYSTEM_SENDER_EMAIL or "D.I. Khan Care <onboarding@resend.dev>")
        )

    def _send_email_smtp(self, to_email: str, subject: str, html_content: str, text_content: str) -> bool:
        """Send email via standard Gmail SMTP with TLS / SSL and RFC-compliant headers."""
        if not self.gmail_user or not self.gmail_password:
            return False

        safe_subj = subject.encode('ascii', 'ignore').decode('ascii').strip()
        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = formataddr(("DI Khan Healthcare", self.gmail_user))
            msg["To"] = to_email
            msg["Date"] = formatdate(localtime=True)
            msg["Message-ID"] = make_msgid(domain="gmail.com")
            msg.set_content(text_content or subject)
            msg.add_alternative(html_content, subtype="html")

            context = ssl.create_default_context()
            
            # Send via Gmail SMTP: Port 465 (SSL) or Port 587 (STARTTLS)
            delivered = False
            try:
                with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context, timeout=12) as server:
                    server.login(self.gmail_user, self.gmail_password)
                    server.send_message(msg)
                    delivered = True
            except Exception:
                with smtplib.SMTP("smtp.gmail.com", 587, timeout=12) as server:
                    server.ehlo()
                    server.starttls(context=context)
                    server.ehlo()
                    server.login(self.gmail_user, self.gmail_password)
                    server.send_message(msg)
                    delivered = True

            if delivered:
                print(f"[Gmail SMTP SUCCESS] Successfully delivered email to {to_email} (Subject: {safe_subj})")
                logger.info(f"[Gmail SMTP] Successfully delivered email to {to_email} (Subject: {safe_subj})")
                return True
            print(f"[Gmail SMTP FAILED] Neither port 465 nor port 587 succeeded for {to_email}")
            return False
        except Exception as e:
            print(f"[Gmail SMTP ERROR] Failed to send email to {to_email}: {e}")
            logger.error(f"[Gmail SMTP Error] Failed to send email to {to_email}: {e}")
            return False

    def _send_email_resend(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email via Resend API."""
        if not self.resend_key:
            return False

        safe_subj = subject.encode('ascii', 'ignore').decode('ascii').strip()
        try:
            import resend
            resend.api_key = self.resend_key
            r = resend.Emails.send({
                "from": self.sender_email,
                "to": to_email,
                "subject": subject,
                "html": html_content
            })
            print(f"[Resend SUCCESS] Delivered email to {to_email} (ID: {r.get('id')})")
            logger.info(f"[Resend] Successfully delivered email to {to_email} (ID: {r.get('id')})")
            return True
        except Exception as e:
            print(f"[Resend ERROR] Failed sending to {to_email}: {e}")
            logger.error(f"[Resend Error] Failed sending to {to_email}: {e}")
            return False

    def dispatch_email(self, to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> bool:
        """
        Dispatches email using best available transport:
        1. Gmail SMTP (if credentials configured in .env)
        2. Resend API (if configured in .env)
        3. Console fallback (guaranteed safe logging in dev)
        """
        if not to_email or "@" not in to_email:
            return False

        clean_to = to_email.strip().lower()
        safe_subj = subject.encode('ascii', 'ignore').decode('ascii').strip()
        txt = text_content or subject
        print(f"\n>>> [EMAIL DISPATCH TRIGGERED] Target: {clean_to} | Subject: {safe_subj}")

        # Attempt 1: Gmail SMTP
        if self.gmail_user and self.gmail_password:
            print(f">>> [EMAIL DISPATCH] Trying Gmail SMTP ({self.gmail_user})...")
            if self._send_email_smtp(clean_to, subject, html_content, txt):
                print(f">>> [EMAIL DISPATCH SUCCESS] Delivered to {clean_to} via Gmail SMTP!\n")
                return True
            else:
                print(f">>> [EMAIL DISPATCH] Gmail SMTP did not succeed, trying fallback...")

        # Attempt 2: Resend API
        if self.resend_key:
            print(f">>> [EMAIL DISPATCH] Trying Resend API...")
            if self._send_email_resend(clean_to, subject, html_content):
                print(f">>> [EMAIL DISPATCH SUCCESS] Delivered to {clean_to} via Resend!\n")
                return True

        # Fallback: Safe console notification
        safe_preview = (txt[:120] if txt else '').encode('ascii', 'ignore').decode('ascii').strip()
        print(f"\n[EMAIL NOTIFICATION CONSOLE FALLBACK]")
        print(f"TO: {clean_to}")
        print(f"SUBJECT: {safe_subj}")
        print(f"PREVIEW: {safe_preview}...")
        print(f"-----------------------------------------\n")
        return True

    async def get_assistant_emails_for_doctor(self, db: AsyncSession, doctor_id: str) -> List[str]:
        """Fetch all active assistant email addresses linked to the given doctor."""
        stmt = (
            select(User.email)
            .join(DoctorAssistant, DoctorAssistant.assistant_user_id == User.id)
            .where(
                and_(
                    DoctorAssistant.doctor_id == doctor_id,
                    DoctorAssistant.status == "active"
                )
            )
        )
        res = await db.execute(stmt)
        emails = [e for e in res.scalars().all() if e and "@" in e]
        return emails

    async def _ensure_full_appointment(self, db: AsyncSession, appt: Appointment) -> Appointment:
        """Ensures all necessary relationships (doctor.user, slot, patient, payment) are loaded asynchronously."""
        try:
            from app.models import Doctor
            stmt = (
                select(Appointment)
                .options(
                    selectinload(Appointment.doctor).selectinload(Doctor.user),
                    selectinload(Appointment.slot),
                    selectinload(Appointment.patient),
                    selectinload(Appointment.payment)
                )
                .where(Appointment.id == appt.id)
            )
            res = await db.execute(stmt)
            loaded = res.scalar_one_or_none()
            return loaded or appt
        except Exception as e:
            logger.warning(f"Error eager loading appointment: {e}")
            return appt

    def _resolve_patient_email(self, appt: Appointment) -> Optional[str]:
        """Resolves the preferred email for patient notifications.
        Prioritizes the appointment-specific patient_email entered during booking,
        falling back to the linked user account email.
        """
        for candidate in [getattr(appt, "patient_email", None), appt.patient.email if (appt and appt.patient) else None]:
            if candidate and isinstance(candidate, str):
                cleaned = candidate.strip().lower()
                if "@" in cleaned and not cleaned.endswith("@dikcare.local"):
                    return cleaned
        return None

    @staticmethod
    def normalize_pk_phone(phone: Optional[str]) -> Optional[str]:
        """Standardizes Pakistani mobile numbers to Evolution API international format (923xxxxxxxxx)."""
        if not phone:
            return None
        digits = re.sub(r"\D", "", phone)
        if not digits:
            return None
        if digits.startswith("03") and len(digits) == 11:
            return "92" + digits[1:]
        if digits.startswith("3") and len(digits) == 10:
            return "92" + digits
        if digits.startswith("92") and len(digits) == 12:
            return digits
        if digits.startswith("0092") and len(digits) == 14:
            return digits[2:]
        if len(digits) >= 10:
            return digits
        return None

    def _resolve_patient_phone(self, appt: Appointment) -> Optional[str]:
        """Resolves the preferred phone number for patient WhatsApp notifications."""
        for candidate in [
            getattr(appt, "patient_phone", None),
            getattr(appt, "loyalty_whatsapp", None),
            getattr(appt, "loyalty_mobile", None),
            appt.patient.whatsapp_number if (appt and appt.patient) else None,
            appt.patient.phone if (appt and appt.patient) else None,
        ]:
            if candidate and isinstance(candidate, str) and candidate.strip():
                return candidate.strip()
        return None

    def _resolve_google_maps_url(self, appt: Appointment) -> str:
        """Resolves doctor clinic Google Maps link directly from the saved doctor profile, with automated search fallback."""
        if appt.doctor and getattr(appt.doctor, 'google_maps_url', None) and appt.doctor.google_maps_url.strip():
            raw = appt.doctor.google_maps_url.strip()
            if "<iframe" in raw and "src=" in raw:
                import re
                m = re.search(r'src=["\']([^"\']+)["\']', raw)
                if m:
                    raw = m.group(1).strip()
            raw = raw.strip('"\'')
            if raw and not raw.startswith("http://") and not raw.startswith("https://"):
                raw = "https://" + raw.lstrip('/')
            if raw and (raw.startswith("http://") or raw.startswith("https://")):
                return raw

        clinic_addr = (appt.doctor.clinic_address if (appt.doctor and appt.doctor.clinic_address) else "Dera Ismail Khan").strip()
        import re
        clinic_clean = re.sub(r'Room\s*#?\d+,?\s*(1st|2nd|3rd|4th)?\s*Floor,?\s*', '', clinic_addr, flags=re.I).strip()
        if "ali hospital" in clinic_clean.lower() or "al-shifa" in clinic_clean.lower():
            return "https://www.google.com/maps/search/?api=1&query=Al-Shifa+Hospital+Opposite+DHQ+Hospital+Dera+Ismail+Khan"
        if "rk" in clinic_clean.lower():
            return "https://www.google.com/maps/search/?api=1&query=RK+Surgical+%26+Aesthetic+Clinic+Jinnah+2+Opposite+DHQ+Hospital+Dera+Ismail+Khan"

        target = f"{clinic_clean or clinic_addr} Opposite DHQ Hospital Dera Ismail Khan"
        return f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(target)}"

    async def get_assistant_phones_for_doctor(self, db: AsyncSession, doctor_id: str) -> List[str]:
        """Fetch all active assistant phone / WhatsApp numbers linked to the given doctor."""
        stmt = (
            select(User.whatsapp_number, User.phone)
            .join(DoctorAssistant, DoctorAssistant.assistant_user_id == User.id)
            .where(
                and_(
                    DoctorAssistant.doctor_id == doctor_id,
                    DoctorAssistant.status == "active"
                )
            )
        )
        res = await db.execute(stmt)
        phones = []
        for wa, p in res.all():
            val = wa or p
            if val and len(val.strip()) >= 7:
                phones.append(val.strip())
        return phones

    async def send_whatsapp(self, phone: str, text: str) -> bool:
        """Sends WhatsApp text notification via Evolution API v2."""
        clean_number = self.normalize_pk_phone(phone)
        if not clean_number:
            logger.warning(f"[Evolution WhatsApp] Invalid phone number skipped: {phone}")
            return False

        if not self.evolution_url or not self.evolution_key:
            logger.warning("[Evolution WhatsApp] Evolution API not configured.")
            return False

        url = f"{self.evolution_url.rstrip('/')}/message/sendText/{urllib.parse.quote(self.evolution_instance)}"
        headers = {
            "apikey": self.evolution_key,
            "Content-Type": "application/json"
        }
        payload = {
            "number": clean_number,
            "text": text
        }
        try:
            if httpx is not None:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code in (200, 201):
                        logger.info(f"[Evolution WhatsApp SUCCESS] Message sent to {clean_number}")
                        print(f"[Evolution WhatsApp SUCCESS] Delivered to {clean_number}")
                        return True
                    else:
                        logger.error(f"[Evolution WhatsApp FAILED] {resp.status_code}: {resp.text}")
                        print(f"[Evolution WhatsApp FAILED] Status {resp.status_code} for {clean_number}")
                        return False
            else:
                async with aiohttp.ClientSession() as session:
                    async with session.post(url, headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=12.0)) as resp:
                        if resp.status in (200, 201):
                            logger.info(f"[Evolution WhatsApp SUCCESS] Message sent to {clean_number}")
                            print(f"[Evolution WhatsApp SUCCESS] Delivered to {clean_number}")
                            return True
                        else:
                            txt = await resp.text()
                            logger.error(f"[Evolution WhatsApp FAILED] {resp.status}: {txt}")
                            print(f"[Evolution WhatsApp FAILED] Status {resp.status} for {clean_number}")
                            return False
        except Exception as e:
            logger.error(f"[Evolution WhatsApp ERROR] Failed sending to {clean_number}: {e}")
            print(f"[Evolution WhatsApp ERROR] {e}")
            return False

    async def send_whatsapp_media(
        self,
        phone: str,
        image_bytes: bytes,
        caption: str,
        fallback_text: Optional[str] = None,
        filename: str = "appointment_notice.png"
    ) -> bool:
        """
        Sends WhatsApp graphic card image notification with caption via Evolution API v2.
        Seamlessly falls back to formatted text (fallback_text or caption) if image transmission encounters any issue.
        """
        clean_number = self.normalize_pk_phone(phone)
        if not clean_number:
            logger.warning(f"[Evolution WhatsApp Media] Invalid phone number skipped: {phone}")
            return False

        fallback = fallback_text if fallback_text else caption

        if not self.evolution_url or not self.evolution_key or not image_bytes:
            return await self.send_whatsapp(phone, fallback)

        import base64
        media_data = base64.b64encode(image_bytes).decode("utf-8")

        url = f"{self.evolution_url.rstrip('/')}/message/sendMedia/{urllib.parse.quote(self.evolution_instance)}"
        headers = {
            "apikey": self.evolution_key,
            "Content-Type": "application/json"
        }
        payload = {
            "number": clean_number,
            "mediatype": "image",
            "mimetype": "image/png",
            "caption": caption,
            "media": media_data,
            "fileName": filename
        }

        try:
            if httpx is not None:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code in (200, 201):
                        logger.info(f"[Evolution WhatsApp Media SUCCESS] Card delivered to {clean_number}")
                        print(f"[Evolution WhatsApp Media SUCCESS] Card delivered to {clean_number}")
                        return True
                    else:
                        logger.warning(f"[Evolution WhatsApp Media FAILED] Status {resp.status_code}: {resp.text}, falling back to text.")
                        print(f"[Evolution WhatsApp Media FAILED] Status {resp.status_code}: {resp.text}")
                        return await self.send_whatsapp(phone, fallback)
            else:
                async with aiohttp.ClientSession() as session:
                    async with session.post(url, headers=headers, json=payload, timeout=aiohttp.ClientTimeout(total=20.0)) as resp:
                        if resp.status in (200, 201):
                            logger.info(f"[Evolution WhatsApp Media SUCCESS] Card delivered to {clean_number}")
                            print(f"[Evolution WhatsApp Media SUCCESS] Card delivered to {clean_number}")
                            return True
                        else:
                            txt = await resp.text()
                            logger.warning(f"[Evolution WhatsApp Media FAILED] Status {resp.status}: {txt}, falling back to text.")
                            print(f"[Evolution WhatsApp Media FAILED] Status {resp.status}: {txt}")
                            return await self.send_whatsapp(phone, fallback)
        except Exception as e:
            logger.error(f"[Evolution WhatsApp Media ERROR] {e}, falling back to text notification.")
            print(f"[Evolution WhatsApp Media ERROR] {e}")
            return await self.send_whatsapp(phone, fallback)

    # -------------------------------------------------------------
    # EVENT 1: Patient submits an appointment request
    # -------------------------------------------------------------
    async def notify_appointment_requested(self, db: AsyncSession, appt: Appointment):
        """Notify patient (Request Sent card) and clinic assistant (Request Received card) via WhatsApp."""
        try:
            appt = await self._ensure_full_appointment(db, appt)
            raw_name = (appt.doctor.user.full_name if (appt.doctor and appt.doctor.user) else "Doctor").strip()
            doc_name = clean_doctor_display_name(raw_name)
            slot_time_str = format_pkt_time(appt.slot.start_time) if appt.slot else "Scheduled"
            slot_date_str = format_pkt_date(appt.slot.start_time) if appt.slot else "Upcoming"
            specialty = appt.doctor.specialty if (appt.doctor and appt.doctor.specialty) else "Specialist"
            clinic_addr = appt.doctor.clinic_address if (appt.doctor and appt.doctor.clinic_address) else "Dera Ismail Khan"

            track_url = f"{settings.FRONTEND_URL.rstrip('/')}/track?slip={appt.slip_number or ''}"
            portal_url = f"{settings.FRONTEND_URL.rstrip('/')}/assistant"
            maps_url = self._resolve_google_maps_url(appt)

            # 1. WhatsApp to Patient: Visual "Request Sent" Card + Google Maps & Tracking Links
            patient_phone = self._resolve_patient_phone(appt)
            if patient_phone:
                patient_fallback_msg = (
                    f"🏥 *DI Khan Care — Clinic Appointment Notice*\n\n"
                    f"🔔 *Appointment Request Sent*\n\n"
                    f"Assalam-o-Alaikum *{appt.patient_name}*,\n"
                    f"Aapki doctor booking request darj kar li gayi hai.\n\n"
                    f"👨‍⚕️ *Doctor:* {doc_name} ({specialty})\n"
                    f"📋 *Slip Number:* #{appt.slip_number or 'N/A'}\n"
                    f"📅 *Date:* {slot_date_str}\n"
                    f"⏰ *Time:* {slot_time_str}\n"
                    f"📍 *Clinic:* {clinic_addr}\n"
                    f"📌 *Status:* ⏳ Pending Confirmation\n\n"
                    f"🗺️ *Clinic Google Maps Location:*\n{maps_url}\n\n"
                    f"ℹ️ _Our team will confirm shortly. Please wait for your confirmation message._\n\n"
                    f"📲 *Track Live Status:*\n{track_url}\n\n"
                    f"📍 *DI Khan Care Clinic • Dera Ismail Khan*"
                )
                patient_card_caption = (
                    f"🗺️ *Clinic Google Maps:*\n{maps_url}\n\n"
                    f"📲 *Live Queue Tracker & Digital Slip:*\n{track_url}"
                )
                try:
                    card_bytes = generate_request_sent_card(
                        patient_name=appt.patient_name or "Patient",
                        doctor_name=doc_name,
                        slip_number=appt.slip_number or "DIK-CARE",
                        visit_date=slot_date_str,
                        slot_time=slot_time_str
                    )
                    await self.send_whatsapp_media(
                        patient_phone,
                        card_bytes,
                        caption=patient_card_caption,
                        fallback_text=patient_fallback_msg,
                        filename=f"request_sent_{appt.slip_number}.png"
                    )
                except Exception as card_err:
                    logger.warning(f"Card generation error: {card_err}, falling back to text.")
                    await self.send_whatsapp(patient_phone, patient_fallback_msg)

            # 2. Visual "Request Received" Alert Card to Assistant Desk / Staff
            assistant_phones = await self.get_assistant_phones_for_doctor(db, appt.doctor_id)
            target_staff_phones = list(assistant_phones)
            if not target_staff_phones and appt.doctor and appt.doctor.clinic_phone:
                target_staff_phones.append(appt.doctor.clinic_phone)

            if target_staff_phones:
                staff_fallback_msg = (
                    f"🔔 *APPOINTMENT REQUEST RECEIVED*\n"
                    f"_D.I. Khan Care • Staff Alert_\n\n"
                    f"Nayi patient booking request review ke liye mosool hui hai:\n\n"
                    f"• *Patient:* {appt.patient_name}\n"
                    f"• *Doctor:* {doc_name}\n"
                    f"• *Date & Time:* {slot_date_str} at {slot_time_str}\n"
                    f"• *Slip:* #{appt.slip_number or ''}\n\n"
                    f"👩‍⚕️ *Open Assistant Desk to Review:*\n{portal_url}"
                )
                staff_card_caption = (
                    f"🔔 *New Request from {appt.patient_name}*\n"
                    f"👨‍⚕️ {doc_name} • {slot_date_str} ({slot_time_str})\n\n"
                    f"👩‍⚕️ *Open Assistant Desk to Confirm:*\n{portal_url}"
                )
                try:
                    assistant_card_bytes = generate_request_received_card(
                        patient_name=appt.patient_name or "Patient",
                        doctor_name=doc_name,
                        slip_number=appt.slip_number or "DIK-CARE",
                        visit_date=slot_date_str,
                        slot_time=slot_time_str
                    )
                except Exception as staff_card_err:
                    logger.warning(f"Staff card generation error: {staff_card_err}")
                    assistant_card_bytes = None

                for p in target_staff_phones:
                    if assistant_card_bytes:
                        await self.send_whatsapp_media(
                            p,
                            assistant_card_bytes,
                            caption=staff_card_caption,
                            fallback_text=staff_fallback_msg,
                            filename=f"request_received_{appt.slip_number}.png"
                        )
                    else:
                        await self.send_whatsapp(p, staff_fallback_msg)

        except Exception as e:
            logger.error(f"Error in notify_appointment_requested: {e}")

    # -------------------------------------------------------------
    # EVENT 2a: Assistant confirms/approves appointment
    # -------------------------------------------------------------
    async def notify_appointment_confirmed(self, db: AsyncSession, appt: Appointment):
        """Notify patient and clinic assistant via WhatsApp when appointment is approved."""
        try:
            appt = await self._ensure_full_appointment(db, appt)
            raw_name = (appt.doctor.user.full_name if (appt.doctor and appt.doctor.user) else "Doctor").strip()
            doc_name = raw_name if raw_name.lower().startswith("dr") else f"Dr. {raw_name}"
            slot_time_str = format_pkt_time(appt.slot.start_time) if appt.slot else "Scheduled"
            slot_date_str = format_pkt_date(appt.slot.start_time) if appt.slot else "Upcoming"
            specialty = appt.doctor.specialty if (appt.doctor and appt.doctor.specialty) else "Specialist"
            clinic_addr = appt.doctor.clinic_address if (appt.doctor and appt.doctor.clinic_address) else "Dera Ismail Khan"
            fee_val = appt.payment.amount if appt.payment else (appt.doctor.consultation_fee if appt.doctor else 1000)
            track_url = f"{settings.FRONTEND_URL.rstrip('/')}/track?slip={appt.slip_number or ''}"

            token_num = (appt.slot.daily_slot_number if appt.slot and getattr(appt.slot, 'daily_slot_number', None) else None)
            if not token_num and appt.slip_number:
                m = re.search(r"-(\d{2,4})-", appt.slip_number)
                if m:
                    try:
                        token_num = int(m.group(1))
                    except Exception:
                        pass
            token_display = f"#{token_num}" if token_num else f"#{appt.slip_number or '1'}"

            # Calculate 20 minutes before appointment arrival time
            arrival_time_str = ""
            if appt.slot and getattr(appt.slot, 'start_time', None):
                try:
                    from datetime import timedelta
                    arrival_time_str = format_pkt_time(appt.slot.start_time - timedelta(minutes=20))
                except Exception:
                    pass
            arrival_line = f"🚪 *Clinic Arrival Time:* {arrival_time_str} (20 minute pehle)\n" if arrival_time_str else "🚪 *Clinic Arrival Time:* Appointment se 20 minute pehle\n"

            # 1. WhatsApp to Patient: Professional Roman Urdu with Doctor Google Maps link & 20 min early arrival
            patient_phone = self._resolve_patient_phone(appt)
            if patient_phone:
                loyalty_notice = ""
                if appt.has_loyalty_discount:
                    loyalty_notice = (
                        "💳 *VIP Loyalty Card:* Approved (Reception se physical card lein)\n"
                    )

                maps_url = self._resolve_google_maps_url(appt)

                patient_msg = (
                    f"✅ *APPOINTMENT CONFIRMED — D.I. KHAN CARE*\n\n"
                    f"Assalam-o-Alaikum *{appt.patient_name}*,\n\n"
                    f"Aapki doctor appointment confirm ho chuki hai aur digital pass jari kar diya gaya hai.\n\n"
                    f"🎫 *Token / Queue Number:* {token_display}\n"
                    f"📋 *Digital Slip:* #{appt.slip_number}\n"
                    f"👨‍⚕️ *Doctor:* {doc_name} ({specialty})\n"
                    f"📅 *Date:* {slot_date_str}\n"
                    f"⏰ *Appointment Time:* {slot_time_str} (PKT)\n"
                    f"{arrival_line}"
                    f"📍 *Clinic:* {clinic_addr}\n"
                    f"💵 *Fee:* Rs. {fee_val} (Clinic arrival par cash ada karein)\n"
                    f"{loyalty_notice}\n"
                    f"🗺️ *Clinic Google Maps Location:*\n"
                    f"{maps_url}\n\n"
                    f"⚠️ *Ahem Hidayat:*\n"
                    f"Baraaye meherbani apne scheduled time se *20 minute pehle* clinic reception par tashreef layen aur apna Token Number ({token_display}) dikhayen taake verification bar-waqt ho sake.\n\n"
                    f"📲 *Open Digital Slip & Live Queue:*\n"
                    f"{track_url}\n\n"
                    f"Shukriya,\n"
                    f"*D.I. Khan Care*"
                )
                patient_card_caption = (
                    f"🗺️ *Clinic Google Maps Location:*\n{maps_url}\n\n"
                    f"📲 *Live Queue Tracker & Digital Slip:*\n{track_url}"
                )
                try:
                    card_bytes = generate_confirmed_card(
                        patient_name=appt.patient_name or "Patient",
                        doctor_name=doc_name,
                        visit_date=slot_date_str,
                        slot_time=slot_time_str,
                        slip_number=appt.slip_number or "DIK-CARE",
                        token_number=token_num
                    )
                    await self.send_whatsapp_media(
                        patient_phone,
                        card_bytes,
                        caption=patient_card_caption,
                        fallback_text=patient_msg,
                        filename=f"confirmed_{appt.slip_number}.png"
                    )
                except Exception as card_err:
                    logger.warning(f"Card generation error: {card_err}, falling back to text.")
                    await self.send_whatsapp(patient_phone, patient_msg)

        except Exception as e:
            logger.error(f"Error in notify_appointment_confirmed: {e}")

    # -------------------------------------------------------------
    # EVENT 2b: Assistant cancels/rejects appointment (Patient ONLY)
    # -------------------------------------------------------------
    async def notify_appointment_cancelled(self, db: AsyncSession, appt: Appointment, reason: str = ""):
        """Notify patient via WhatsApp when appointment is cancelled."""
        try:
            appt = await self._ensure_full_appointment(db, appt)
            raw_name = (appt.doctor.user.full_name if (appt.doctor and appt.doctor.user) else "Doctor").strip()
            doc_name = raw_name if raw_name.lower().startswith("dr") else f"Dr. {raw_name}"
            slot_time_str = format_pkt_time(appt.slot.start_time) if appt.slot else "Scheduled"
            slot_date_str = format_pkt_date(appt.slot.start_time) if appt.slot else "Upcoming"
            
            # Construct direct 1-click rebook URL with retained patient details
            import urllib.parse
            doc_id_val = str(appt.doctor_id) if appt.doctor_id else ""
            clean_name = (appt.patient_name or "").strip()
            patient_phone = self._resolve_patient_phone(appt) or ""
            rebook_params = []
            if doc_id_val:
                rebook_params.append(f"doctor_id={doc_id_val}")
            rebook_params.append("action=booking")
            if clean_name:
                rebook_params.append(f"name={urllib.parse.quote_plus(clean_name)}")
            if patient_phone:
                rebook_params.append(f"phone={patient_phone}")
            if appt.slip_number:
                rebook_params.append(f"slip={appt.slip_number}")

            rebook_query = "&".join(rebook_params)
            rebook_url = f"{settings.FRONTEND_URL.rstrip('/')}/?{rebook_query}" if rebook_query else f"{settings.FRONTEND_URL.rstrip('/')}/"

            # WhatsApp to Patient ONLY
            if patient_phone:
                is_blackout = any(k in (reason or "").lower() for k in ["clinic closed", "blackout", "leave", "maintenance", "band"])
                if is_blackout:
                    patient_msg = (
                        f"❌ *CLINIC CLOSED — APPOINTMENT CANCELLED*\n\n"
                        f"Assalam-o-Alaikum *{appt.patient_name}*,\n\n"
                        f"Clinic emergency leave / band hone ki wajah se {doc_name} ke sath aapki appointment cancel kardi gayi hai.\n\n"
                        f"📋 *Old Slip Number:* #{appt.slip_number or 'N/A'}\n"
                        f"📅 *Cancelled Date:* {slot_date_str}\n"
                        f"⏰ *Time:* {slot_time_str}\n"
                        f"📝 *Reason:* {reason or 'Clinic closed for this date'}\n\n"
                        f"🔄 *Naya din aur waqt muntakhib karne ke liye is link par click karein:*\n"
                        f"{rebook_url}\n\n"
                        f"*(Aapka naam aur mobile number pehle se mehfooz hai, dobara likhne ki zaroorat nahi.)*\n\n"
                        f"📍 *DI Khan Care Clinic • Dera Ismail Khan*"
                    )
                    patient_card_caption = (
                        f"❌ *Clinic Closed — Appointment Cancelled*\n"
                        f"Please select another date and time (details pre-retained):\n"
                        f"🌐 {rebook_url}"
                    )
                else:
                    patient_msg = (
                        f"❌ *APPOINTMENT CANCELLED — DI KHAN CARE*\n\n"
                        f"Assalam-o-Alaikum *{appt.patient_name}*,\n\n"
                        f"Maazrat ke sath {doc_name} ke sath aapki appointment cancel kardi gayi hai.\n\n"
                        f"📋 *Slip Number:* #{appt.slip_number or 'N/A'}\n"
                        f"📅 *Date:* {slot_date_str}\n"
                        f"⏰ *Time:* {slot_time_str}\n"
                        f"📝 *Reason:* {reason or 'Clinic schedule adjustment ya patient request'}\n\n"
                        f"🔄 *Book Another Appointment Slot:*\n"
                        f"{rebook_url}\n\n"
                        f"📍 *DI Khan Care Clinic • Dera Ismail Khan*"
                    )
                    patient_card_caption = f"🌐 *Book Again / Clinic Portal:*\n{rebook_url}"
                try:
                    card_bytes = generate_cancelled_card(
                        patient_name=appt.patient_name or "Patient",
                        doctor_name=doc_name,
                        slip_number=appt.slip_number or "DIK-CARE",
                        visit_date=slot_date_str,
                        slot_time=slot_time_str
                    )
                    await self.send_whatsapp_media(
                        patient_phone,
                        card_bytes,
                        caption=patient_card_caption,
                        fallback_text=patient_msg,
                        filename=f"cancelled_{appt.slip_number}.png"
                    )
                except Exception as card_err:
                    logger.warning(f"Card generation error: {card_err}, falling back to text.")
                    await self.send_whatsapp(patient_phone, patient_msg)

        except Exception as e:
            logger.error(f"Error in notify_appointment_cancelled: {e}")

    # -------------------------------------------------------------
    # EVENT 2c: Assistant reschedules appointment (Patient ONLY)
    # -------------------------------------------------------------
    async def notify_appointment_rescheduled(self, db: AsyncSession, appt: Appointment, reason: str = ""):
        """Notify patient via WhatsApp with new date, time, and new token number when rescheduled."""
        try:
            appt = await self._ensure_full_appointment(db, appt)
            raw_name = (appt.doctor.user.full_name if (appt.doctor and appt.doctor.user) else "Doctor").strip()
            doc_name = raw_name if raw_name.lower().startswith("dr") else f"Dr. {raw_name}"
            slot_time_str = format_pkt_time(appt.slot.start_time) if appt.slot else "Scheduled"
            slot_date_str = format_pkt_date(appt.slot.start_time) if appt.slot else "Upcoming"
            specialty = appt.doctor.specialty if (appt.doctor and appt.doctor.specialty) else "Specialist"
            clinic_addr = appt.doctor.clinic_address if (appt.doctor and appt.doctor.clinic_address) else "Dera Ismail Khan"
            track_url = f"{settings.FRONTEND_URL.rstrip('/')}/track?slip={appt.slip_number or ''}"

            token_num = (appt.slot.daily_slot_number if appt.slot and getattr(appt.slot, 'daily_slot_number', None) else None)
            if not token_num and appt.slip_number:
                m = re.search(r"-(\d{2,4})-", appt.slip_number)
                if m:
                    try:
                        token_num = int(m.group(1))
                    except Exception:
                        pass
            token_display = f"#{token_num}" if token_num else f"#{appt.slip_number or '1'}"

            # Calculate 20 minutes before new appointment arrival time
            arrival_time_str = ""
            if appt.slot and getattr(appt.slot, 'start_time', None):
                try:
                    from datetime import timedelta
                    arrival_time_str = format_pkt_time(appt.slot.start_time - timedelta(minutes=20))
                except Exception:
                    pass
            arrival_line = f"🚪 *New Clinic Arrival Time:* {arrival_time_str} (20 minute pehle)\n" if arrival_time_str else "🚪 *New Clinic Arrival Time:* Naye time se 20 minute pehle\n"

            patient_phone = self._resolve_patient_phone(appt)
            if patient_phone:
                maps_url = self._resolve_google_maps_url(appt)

                patient_msg = (
                    f"🔄 *APPOINTMENT RESCHEDULED — DI KHAN CARE*\n\n"
                    f"Assalam-o-Alaikum *{appt.patient_name}*,\n\n"
                    f"Aapki appointment naye waqt par reschedule kardi gayi hai.\n\n"
                    f"🎫 *New Token / Queue Number:* {token_display}\n"
                    f"📋 *Updated Slip Number:* #{appt.slip_number}\n"
                    f"👨‍⚕️ *Doctor:* {doc_name} ({specialty})\n"
                    f"📅 *New Date:* {slot_date_str}\n"
                    f"⏰ *New Appointment Time:* {slot_time_str} (PKT)\n"
                    f"{arrival_line}"
                    f"📍 *Clinic:* {clinic_addr}\n"
                    f"📝 *Reason:* {reason or 'Clinic schedule adjustment'}\n\n"
                    f"ℹ️ _Note: Your appointment has been moved to new time. Please arrive 15 minutes early._\n\n"
                    f"🗺️ *Clinic Google Maps Location:*\n{maps_url}\n\n"
                    f"📲 *Open Updated Digital Slip & Live Queue:*\n{track_url}\n\n"
                    f"📍 *DI Khan Care Clinic • Dera Ismail Khan*"
                )
                patient_card_caption = (
                    f"🗺️ *Clinic Google Maps Location:*\n{maps_url}\n\n"
                    f"📲 *Open Updated Digital Slip & Live Queue:*\n{track_url}"
                )
                try:
                    card_bytes = generate_rescheduled_card(
                        patient_name=appt.patient_name or "Patient",
                        doctor_name=doc_name,
                        slip_number=appt.slip_number or "DIK-CARE",
                        old_date=slot_date_str,
                        old_time=slot_time_str,
                        new_date=slot_date_str,
                        new_time=slot_time_str
                    )
                    await self.send_whatsapp_media(
                        patient_phone,
                        card_bytes,
                        caption=patient_card_caption,
                        fallback_text=patient_msg,
                        filename=f"rescheduled_{appt.slip_number}.png"
                    )
                except Exception as card_err:
                    logger.warning(f"Card generation error: {card_err}, falling back to text.")
                    await self.send_whatsapp(patient_phone, patient_msg)

        except Exception as e:
            logger.error(f"Error in notify_appointment_rescheduled: {e}")

    # -------------------------------------------------------------
    # EVENT 3: 1-Hour Reminder before appointment booked time
    # -------------------------------------------------------------
    async def notify_appointment_reminder_1h(self, db: AsyncSession, appt: Appointment):
        """Send reminder via WhatsApp 1 hour before scheduled consultation time."""
        try:
            appt = await self._ensure_full_appointment(db, appt)
            raw_name = (appt.doctor.user.full_name if (appt.doctor and appt.doctor.user) else "Doctor").strip()
            doc_name = raw_name if raw_name.lower().startswith("dr") else f"Dr. {raw_name}"
            slot_date_str = format_pkt_date(appt.slot.start_time) if appt.slot else "Upcoming"
            slot_time_str = format_pkt_time(appt.slot.start_time) if appt.slot else "1 Hour"
            clinic_addr = appt.doctor.clinic_address if (appt.doctor and appt.doctor.clinic_address) else "Dera Ismail Khan"
            track_url = f"{settings.FRONTEND_URL.rstrip('/')}/track?slip={appt.slip_number or ''}"

            token_num = (appt.slot.daily_slot_number if appt.slot and getattr(appt.slot, 'daily_slot_number', None) else None)
            if not token_num and appt.slip_number:
                m = re.search(r"-(\d{2,4})-", appt.slip_number)
                if m:
                    try:
                        token_num = int(m.group(1))
                    except Exception:
                        pass
            token_display = f"#{token_num}" if token_num else f"#{appt.slip_number or '1'}"

            # Calculate 20 minutes before appointment arrival time
            arrival_time_str = ""
            if appt.slot and getattr(appt.slot, 'start_time', None):
                try:
                    from datetime import timedelta
                    arrival_time_str = format_pkt_time(appt.slot.start_time - timedelta(minutes=20))
                except Exception:
                    pass
            arrival_info = f"{arrival_time_str} (20 minute pehle)" if arrival_time_str else "20 minute pehle"

            patient_phone = self._resolve_patient_phone(appt)
            if patient_phone:
                maps_url = self._resolve_google_maps_url(appt)

                rem_msg = (
                    f"⏱️ *APPOINTMENT REMINDER — DI KHAN CARE*\n\n"
                    f"Assalam-o-Alaikum *{appt.patient_name}*,\n\n"
                    f"Yeh ek reminder hai ke {doc_name} ke sath aapki appointment scheduled hai.\n\n"
                    f"🎫 *Token Number:* {token_display}\n"
                    f"📋 *Slip Number:* #{appt.slip_number}\n"
                    f"👨‍⚕️ *Doctor:* {doc_name}\n"
                    f"📅 *Date:* {slot_date_str}\n"
                    f"⏰ *Appointment Time:* {slot_time_str} (PKT)\n"
                    f"🚪 *Clinic Arrival Time:* {arrival_info}\n"
                    f"📍 *Clinic:* {clinic_addr}\n\n"
                    f"🗺️ *Clinic Google Maps Location:*\n{maps_url}\n\n"
                    f"⚠️ *Ahem Hidayat:*\n"
                    f"Note: Please arrive 15 minutes early. Bring CNIC and Slip.\n\n"
                    f"🔍 *Live Queue Tracker:*\n{track_url}\n\n"
                    f"📍 *DI Khan Care Clinic • Dera Ismail Khan*"
                )
                rem_card_caption = (
                    f"🗺️ *Clinic Google Maps Location:*\n{maps_url}\n\n"
                    f"📲 *Live Queue Tracker:*\n{track_url}"
                )
                try:
                    card_bytes = generate_reminder_card(
                        patient_name=appt.patient_name or "Patient",
                        doctor_name=doc_name,
                        visit_date=slot_date_str,
                        slot_time=slot_time_str,
                        slip_number=appt.slip_number or "DIK-CARE"
                    )
                    await self.send_whatsapp_media(
                        patient_phone,
                        card_bytes,
                        caption=rem_card_caption,
                        fallback_text=rem_msg,
                        filename=f"reminder_{appt.slip_number}.png"
                    )
                except Exception as card_err:
                    logger.warning(f"Card generation error: {card_err}, falling back to text.")
                    await self.send_whatsapp(patient_phone, rem_msg)

        except Exception as e:
            logger.error(f"Error in notify_appointment_reminder_1h: {e}")

    # -------------------------------------------------------------
    # EVENT 4: After doctor marks status COMPLETED
    # -------------------------------------------------------------
    async def notify_appointment_completed(self, db: AsyncSession, appt: Appointment, clinical_notes: str = ""):
        """Notify patient via WhatsApp when consultation is completed, with review link."""
        try:
            appt = await self._ensure_full_appointment(db, appt)
            raw_name = (appt.doctor.user.full_name if (appt.doctor and appt.doctor.user) else "Doctor").strip()
            doc_name = raw_name if raw_name.lower().startswith("dr") else f"Dr. {raw_name}"
            review_url = f"{settings.FRONTEND_URL.rstrip('/')}/?doctor_id={appt.doctor_id}&review=1&slip={appt.slip_number or ''}"

            patient_phone = self._resolve_patient_phone(appt)
            if patient_phone:
                slot_time_str = format_pkt_time(appt.slot.start_time) if appt.slot else "Completed"
                slot_date_str = format_pkt_date(appt.slot.start_time) if appt.slot else "Today"

                comp_fallback_msg = (
                    f"🩺 *CONSULTATION COMPLETED — D.I. KHAN CARE*\n\n"
                    f"Assalam-o-Alaikum *{appt.patient_name}*,\n\n"
                    f"{doc_name} ke sath aapka check-up mukammal ho chuka hai. Allah Ta'ala aapko mukammal sehat ata farmaye.\n\n"
                    f"⭐ *Doctor Feedback & Rating:*\n"
                    f"Aapka tajurba kaisa raha? Doosre mareezon ki rehnumai ke liye 30 second mein apna review darj karein:\n"
                    f"{review_url}\n\n"
                    f"📍 *DI Khan Care Clinic • Dera Ismail Khan*"
                )
                comp_card_caption = f"⭐ *Rate Doctor & Leave Review:*\n{review_url}"
                try:
                    card_bytes = generate_completed_card(
                        patient_name=appt.patient_name or "Patient",
                        doctor_name=doc_name,
                        slip_number=appt.slip_number or "DIK-CARE",
                        visit_date=slot_date_str,
                        slot_time=slot_time_str
                    )
                    await self.send_whatsapp_media(
                        patient_phone,
                        card_bytes,
                        caption=comp_card_caption,
                        fallback_text=comp_fallback_msg,
                        filename=f"completed_{appt.slip_number}.png"
                    )
                except Exception as card_err:
                    logger.warning(f"Card generation error in notify_appointment_completed: {card_err}, falling back to text.")
                    await self.send_whatsapp(patient_phone, comp_fallback_msg)

        except Exception as e:
            logger.error(f"Error in notify_appointment_completed: {e}")

    # -------------------------------------------------------------
    # Scheduler: Scan and send 1-hour reminders
    # -------------------------------------------------------------
    async def check_and_send_1h_reminders(self, db: AsyncSession):
        """Scans for confirmed appointments scheduled ~1 hour from now and sends reminder."""
        try:
            from app.core.redis import redis_manager
            now_utc = datetime.now(timezone.utc)
            # Window: 45 to 75 minutes from now
            win_start = now_utc + timedelta(minutes=45)
            win_end = now_utc + timedelta(minutes=75)

            stmt = (
                select(Appointment)
                .join(DoctorSlot, Appointment.slot_id == DoctorSlot.id)
                .options(
                    selectinload(Appointment.doctor).selectinload(Doctor.user),
                    selectinload(Appointment.patient),
                    selectinload(Appointment.slot)
                )
                .where(
                    and_(
                        Appointment.status == "CONFIRMED",
                        DoctorSlot.start_time >= win_start,
                        DoctorSlot.start_time <= win_end
                    )
                )
            )
            res = await db.execute(stmt)
            appts = res.scalars().all()

            for appt in appts:
                # Check if reminder already sent via Redis or notes
                cache_key = f"appt:reminder_1h:{appt.id}"
                already_sent = await redis_manager.get(cache_key)
                if already_sent:
                    continue

                await self.notify_appointment_reminder_1h(db, appt)
                # Store marker for 24 hours so it is only sent once
                await redis_manager.set(cache_key, "1", ex=86400)
                logger.info(f"Dispatched 1-hour reminder for appointment {appt.id} (Slip #{appt.slip_number})")
        except Exception as e:
            logger.error(f"Error checking 1h reminders: {e}")

    # -------------------------------------------------------------
    # EVENT 5: Doctor Login from Another / New Device Security Alert
    # -------------------------------------------------------------
    async def notify_doctor_new_device_login(
        self,
        doctor_user_id: str,
        device_name: str,
        client_ip: str
    ):
        """Sends WhatsApp security alert to doctor when their account logs in on another device."""
        try:
            from app.core.database import AsyncSessionLocal
            from app.models import User, Doctor
            from datetime import datetime, timezone, timedelta

            async with AsyncSessionLocal() as db:
                doctor_user = await db.get(User, doctor_user_id)
                if not doctor_user:
                    return

                pkt_time = (datetime.now(timezone.utc) + timedelta(hours=5)).strftime("%d %b %Y, %I:%M %p")
                raw_name = (doctor_user.full_name or "Doctor").strip()
                doc_name = raw_name if raw_name.lower().startswith("dr") else f"Dr. {raw_name}"

                phones_to_alert = []
                if doctor_user.whatsapp_number and len(doctor_user.whatsapp_number.strip()) >= 7:
                    phones_to_alert.append(doctor_user.whatsapp_number.strip())
                if doctor_user.phone and len(doctor_user.phone.strip()) >= 7 and doctor_user.phone.strip() not in phones_to_alert:
                    phones_to_alert.append(doctor_user.phone.strip())

                # Also alert linked assistant(s) or clinic contact if doctor's personal phone not set or invalid
                doc_res = await db.execute(select(Doctor).where(Doctor.user_id == doctor_user.id))
                doc = doc_res.scalar_one_or_none()
                if doc:
                    assistant_phones = await self.get_assistant_phones_for_doctor(db, doc.id)
                    for ap in assistant_phones:
                        if ap not in phones_to_alert:
                            phones_to_alert.append(ap)

                admin_phone_1 = "0332 5255879"
                admin_phone_2 = "0336 9875724"
                admin_wa_1 = "https://wa.me/923325255879"
                admin_wa_2 = "https://wa.me/923369875724"
                alert_msg = (
                    f"🚨 *SECURITY ALERT: NEW DEVICE LOGIN — D.I. KHAN CARE*\n\n"
                    f"Assalam-o-Alaikum *{doc_name}*,\n\n"
                    f"Aapke Doctor Portal account credentials ek doosri / nayi device par login kiye gaye hain:\n\n"
                    f"📱 *Logged-in Device:* {device_name}\n"
                    f"🌐 *IP Address:* {client_ip}\n"
                    f"⏰ *Login Time:* {pkt_time} (PKT)\n"
                    f"📧 *Account Email:* {doctor_user.email}\n\n"
                    f"⚠️ *Ahem Security Notice:*\n"
                    f"Agar yeh login aapne khud kisi nayi device par kiya hai, toh kisi action ki zaroorat nahi.\n\n"
                    f"Agar yeh login aapne *nahi kiya*, toh foran apne credentials / password change karwane ke liye Administrator se rabta karein:\n\n"
                    f"📞 *Administrator Contacts (Credentials Change):*\n"
                    f"• Admin Desk 1: {admin_phone_1} ({admin_wa_1})\n"
                    f"• Admin Desk 2: {admin_phone_2} ({admin_wa_2})\n\n"
                    f"Shukriya,\n"
                    f"*D.I. Khan Care Security Desk*"
                )

                for phone in phones_to_alert:
                    await self.send_whatsapp(phone, alert_msg)

        except Exception as e:
            logger.error(f"Error in notify_doctor_new_device_login: {e}")

notification_service = NotificationService()

async def send_whatsapp(phone: str, text: str) -> bool:
    """Module-level shortcut for BackgroundTasks sending WhatsApp messages."""
    return await notification_service.send_whatsapp(phone, text)
