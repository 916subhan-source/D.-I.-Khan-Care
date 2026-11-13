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
import aiohttp
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

    # -------------------------------------------------------------
    # EVENT 1: Patient submits an appointment request
    # -------------------------------------------------------------
    async def notify_appointment_requested(self, db: AsyncSession, appt: Appointment):
        """Notify patient and clinic assistant/doctor via WhatsApp when a new appointment request is submitted."""
        try:
            appt = await self._ensure_full_appointment(db, appt)
            raw_name = (appt.doctor.user.full_name if (appt.doctor and appt.doctor.user) else "Doctor").strip()
            doc_name = raw_name if raw_name.lower().startswith("dr") else f"Dr. {raw_name}"
            slot_time_str = format_pkt_time(appt.slot.start_time) if appt.slot else "Scheduled"
            slot_date_str = format_pkt_date(appt.slot.start_time) if appt.slot else "Upcoming"
            specialty = appt.doctor.specialty if (appt.doctor and appt.doctor.specialty) else "Specialist"
            clinic_addr = appt.doctor.clinic_address if (appt.doctor and appt.doctor.clinic_address) else "Dera Ismail Khan"

            track_url = f"{settings.FRONTEND_URL.rstrip('/')}/track?slip={appt.slip_number or ''}"
            portal_url = f"{settings.FRONTEND_URL.rstrip('/')}/assistant"

            # 1. WhatsApp to Patient: No date & time, notifies request is sent, confirmation pending, stay connected
            patient_phone = self._resolve_patient_phone(appt)
            if patient_phone:
                patient_msg = (
                    f"🏥 *D.I. Khan Care*\n\n"
                    f"محترم/محترمہ *{appt.patient_name}*،\n"
                    f"آپ کی بکنگ کی درخواست کامیابی سے بھیج دی گئی ہے۔\n\n"
                    f"👨‍⚕️ *ڈاکٹر:* {doc_name} ({specialty})\n"
                    f"📋 *درخواست نمبر:* #{appt.slip_number or ''}\n\n"
                    f"جیسے ہی کلینک سے آپ کی بکنگ کنفرم ہو گی، آپ کو تصدیقی پیغام اور ٹوکن نمبر موصول ہو جائے گا۔\n\n"
                    f"براہ کرم ہمارے ساتھ جڑے رہیں۔ (Stay connected with us)\n\n"
                    f"شکریہ،\n"
                    f"*D.I. Khan Care*"
                )
                await self.send_whatsapp(patient_phone, patient_msg)

            # 2. Short WhatsApp to Assistant(s): New request in portal inbox
            assistant_phones = await self.get_assistant_phones_for_doctor(db, appt.doctor_id)
            staff_msg = (
                f"🔔 *New Request in Portal Inbox — D.I. Khan Care*\n\n"
                f"You have a new patient booking request in your portal inbox:\n\n"
                f"👤 *Patient:* {appt.patient_name}\n"
                f"👨‍⚕️ *Doctor:* {doc_name}\n"
                f"📋 *Slip:* #{appt.slip_number or ''}\n\n"
                f"👉 *Open Inbox:* {portal_url}"
            )
            for p in assistant_phones:
                await self.send_whatsapp(p, staff_msg)

            if not assistant_phones and appt.doctor and appt.doctor.clinic_phone:
                await self.send_whatsapp(appt.doctor.clinic_phone, staff_msg)

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

            # 1. WhatsApp to Patient
            patient_phone = self._resolve_patient_phone(appt)
            if patient_phone:
                loyalty_notice = ""
                if appt.has_loyalty_discount:
                    loyalty_notice = (
                        "\n💳 *VIP Golden Loyalty Card Approved!*\n"
                        "براہ کرم کلینک پہنچنے پر ریسیپشن سے اپنا فزیکل گولڈن کارڈ وصول کریں۔\n"
                    )

                patient_msg = (
                    f"✅ *Appointment Confirmed — D.I. Khan Care*\n\n"
                    f"محترم/محترمہ *{appt.patient_name}*،\n"
                    f"آپ کی اپوائنٹمنٹ کنفرم ہو گئی ہے اور آپ کا ڈیجیٹل پاس جاری کر دیا گیا ہے۔\n\n"
                    f"🎫 *Queue / Token Number:* {token_display}\n"
                    f"📋 *Digital Slip:* #{appt.slip_number}\n"
                    f"👨‍⚕️ *Doctor:* {doc_name} ({specialty})\n"
                    f"📅 *Date:* {slot_date_str}\n"
                    f"⏰ *Time:* {slot_time_str} (PKT)\n"
                    f"📍 *Clinic:* {clinic_addr}\n"
                    f"💵 *Fee:* Rs. {fee_val} (Pay Cash at Clinic Arrival)\n"
                    f"{loyalty_notice}\n"
                    f"⚠️ *اہم ہدایات:*\n"
                    f"برائے مہربانی اپنے وقت سے 10-15 منٹ پہلے کلینک تشریف لائیں اور ریسیپشن پر اپنا ٹوکن نمبر {token_display} دکھائیں۔\n\n"
                    f"📲 *Open Digital Slip & Live Queue:*\n"
                    f"{track_url}\n\n"
                    f"شکریہ،\n"
                    f"*D.I. Khan Care*"
                )
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
            rebook_url = f"{settings.FRONTEND_URL.rstrip('/')}/"

            # WhatsApp to Patient ONLY
            patient_phone = self._resolve_patient_phone(appt)
            if patient_phone:
                patient_msg = (
                    f"❌ *Appointment Cancelled — D.I. Khan Care*\n\n"
                    f"محترم/محترمہ *{appt.patient_name}*،\n"
                    f"معذرت کے ساتھ {doc_name} سے آپ کی اپوائنٹمنٹ منسوخ کر دی گئی ہے۔\n\n"
                    f"📋 *Slip Number:* #{appt.slip_number or 'N/A'}\n"
                    f"📝 *Reason:* {reason or 'Clinic schedule adjustment or patient request'}\n\n"
                    f"🔄 *Book Another Appointment Slot:*\n"
                    f"{rebook_url}\n\n"
                    f"کسی بھی رہنمائی کے لیے کلینک ریسیپشن سے رابطہ فرمائیں۔\n\n"
                    f"*D.I. Khan Care*"
                )
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

            patient_phone = self._resolve_patient_phone(appt)
            if patient_phone:
                patient_msg = (
                    f"🔄 *Appointment Rescheduled — D.I. Khan Care*\n\n"
                    f"محترم/محترمہ *{appt.patient_name}*،\n"
                    f"آپ کی اپوائنٹمنٹ نئے وقت پر ری شیڈول (Reschedule) کر دی گئی ہے۔ آپ کا نیا ڈیجیٹل ٹوکن جاری کر دیا گیا ہے۔\n\n"
                    f"🎫 *New Token / Queue Number:* {token_display}\n"
                    f"📋 *Updated Slip Number:* #{appt.slip_number}\n"
                    f"👨‍⚕️ *Doctor:* {doc_name} ({specialty})\n"
                    f"📅 *New Date:* {slot_date_str}\n"
                    f"⏰ *New Time:* {slot_time_str} (PKT)\n"
                    f"📍 *Clinic:* {clinic_addr}\n"
                    f"📝 *Reason:* {reason or 'Clinic schedule adjustment'}\n\n"
                    f"⚠️ *اہم ہدایات:*\n"
                    f"برائے مہربانی اپنے نئے وقت سے 10-15 منٹ پہلے کلینک تشریف لائیں اور ریسیپشن پر اپنا نیا ٹوکن نمبر {token_display} دکھائیں۔\n\n"
                    f"📲 *Open Updated Digital Slip & Live Queue:*\n"
                    f"{track_url}\n\n"
                    f"شکریہ،\n"
                    f"*D.I. Khan Care*"
                )
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

            patient_phone = self._resolve_patient_phone(appt)
            if patient_phone:
                rem_msg = (
                    f"⏱️ *1-Hour Reminder — D.I. Khan Care*\n\n"
                    f"محترم/محترمہ *{appt.patient_name}*،\n"
                    f"{doc_name} سے آپ کی اپوائنٹمنٹ 1 گھنٹے بعد شیڈول ہے۔\n\n"
                    f"🎫 *Token Number:* {token_display}\n"
                    f"⏰ *Time:* {slot_time_str} (PKT)\n"
                    f"📍 *Clinic:* {clinic_addr}\n\n"
                    f"برائے مہربانی وقت پر تشریف لائیں۔ آپ نیچے دیے گئے لنک سے لائیو قطار (Live Queue) دیکھ سکتے ہیں:\n\n"
                    f"🔍 *Live Queue Tracker:*\n"
                    f"{track_url}\n\n"
                    f"*D.I. Khan Care*"
                )
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
                comp_msg = (
                    f"🩺 *Consultation Completed — D.I. Khan Care*\n\n"
                    f"محترم/محترمہ *{appt.patient_name}*،\n"
                    f"{doc_name} سے آپ کا معائنہ مکمل ہو چکا ہے۔ اللہ تعالیٰ آپ کو صحتِ کاملہ عطا فرمائے۔\n\n"
                    f"⭐ *Doctor Feedback & Rating:*\n"
                    f"آپ کا تجربہ کیسا رہا؟ براہ کرم ڈاکٹر صاحب کے بارے میں اپنے تاثرات درج کریں تاکہ دوسرے مریضوں کو مدد مل سکے:\n"
                    f"{review_url}\n\n"
                    f"شکریہ،\n"
                    f"*D.I. Khan Care*"
                )
                await self.send_whatsapp(patient_phone, comp_msg)

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

notification_service = NotificationService()
