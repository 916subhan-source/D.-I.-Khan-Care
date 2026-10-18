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

    # -------------------------------------------------------------
    # EVENT 1: Patient submits an appointment request
    # -------------------------------------------------------------
    async def notify_appointment_requested(self, db: AsyncSession, appt: Appointment):
        """Notify assistant Gmail when a new appointment request is submitted."""
        try:
            appt = await self._ensure_full_appointment(db, appt)
            assistant_emails = await self.get_assistant_emails_for_doctor(db, appt.doctor_id)

            raw_name = (appt.doctor.user.full_name if (appt.doctor and appt.doctor.user) else "Doctor").strip()
            doc_name = raw_name if raw_name.lower().startswith("dr") else f"Dr. {raw_name}"
            slot_time_str = format_pkt_time(appt.slot.start_time) if appt.slot else "Scheduled"
            slot_date_str = format_pkt_date(appt.slot.start_time) if appt.slot else "Upcoming"

            portal_url = "http://localhost:5173/assistant"

            if assistant_emails:
                subject = f"[DI Khan Care] New Booking Request: {appt.patient_name} - Slip #{appt.slip_number}"
                html = f"""
                <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="background-color: #0369a1; padding: 20px; color: white; text-align: center;">
                        <h2 style="margin: 0; font-size: 20px;">D.I. Khan Healthcare Portal</h2>
                        <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.95;">New Patient Consultation Request &middot; Assistant Desk</p>
                    </div>
                    <div style="padding: 24px; background-color: #ffffff;">
                        <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
                            Hello Clinic Assistant,
                        </p>
                        <p style="font-size: 14px; color: #475569; line-height: 1.5;">
                            A new patient has submitted a booking request for <strong>{doc_name}</strong> and is waiting for your desk review &amp; approval.
                        </p>
                        <div style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 16px; margin: 18px 0;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                <tr style="border-bottom: 1px solid #edf2f7;">
                                    <td style="padding: 8px 0; color: #64748b; font-weight: bold; width: 140px;">Patient Name:</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">{appt.patient_name}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #edf2f7;">
                                    <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Mobile / WhatsApp:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">{appt.patient_phone}</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #edf2f7;">
                                    <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Doctor:</td>
                                    <td style="padding: 8px 0; color: #0f172a;">{doc_name} ({appt.doctor.specialty if appt.doctor else 'Specialist'})</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #edf2f7;">
                                    <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Requested Slot:</td>
                                    <td style="padding: 8px 0; color: #0284c7; font-weight: bold;">{slot_date_str} at {slot_time_str} (PKT)</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Digital Slip #:</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-family: monospace; font-weight: bold;">#{appt.slip_number}</td>
                                </tr>
                            </table>
                        </div>

                        <div style="text-align: center; margin: 24px 0 12px 0;">
                            <a href="{portal_url}" style="background-color: #0369a1; color: white; padding: 12px 26px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(3,105,161,0.25);">
                                📋 Open Assistant Desk to Review &amp; Approve
                            </a>
                        </div>
                        <p style="text-align: center; font-size: 12px; color: #64748b; margin: 0 0 16px 0;">
                            Direct Portal Link: <a href="{portal_url}" style="color: #0369a1; text-decoration: underline; font-family: monospace;">{portal_url}</a>
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                        D.I. Khan Doctor Appointment System &middot; Reception Desk Dispatch
                    </div>
                </div>
                """
                for email in assistant_emails:
                    self.dispatch_email(email, subject, html)
            else:
                # If doctor has no assistant assigned yet, alert the doctor directly
                doc_email = appt.doctor.user.email if (appt.doctor and appt.doctor.user) else None
                if doc_email and "@" in doc_email:
                    doc_portal_url = "http://localhost:5173/doctor"
                    subject = f"🔔 New Booking Request: {appt.patient_name} - Slip #{appt.slip_number}"
                    html = f"""
                    <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <div style="background-color: #0369a1; padding: 20px; color: white; text-align: center;">
                            <h2 style="margin: 0; font-size: 20px;">D.I. Khan Healthcare Portal</h2>
                            <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.95;">New Patient Consultation Request &middot; Doctor Workspace</p>
                        </div>
                        <div style="padding: 24px; background-color: #ffffff;">
                            <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
                                Dear <strong>{doc_name}</strong>,
                            </p>
                            <p style="font-size: 14px; color: #475569; line-height: 1.5;">
                                A new patient has booked an appointment at your clinic and is waiting for review:
                            </p>
                            <div style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 16px; margin: 18px 0;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                    <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 140px;">Patient:</td><td style="font-weight: bold;">{appt.patient_name}</td></tr>
                                    <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Phone:</td><td>{appt.patient_phone}</td></tr>
                                    <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Slot:</td><td style="color: #0284c7; font-weight: bold;">{slot_date_str} at {slot_time_str} (PKT)</td></tr>
                                    <tr><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Slip:</td><td style="font-family: monospace; font-weight: bold;">#{appt.slip_number}</td></tr>
                                </table>
                            </div>
                            <div style="text-align: center; margin: 24px 0 12px 0;">
                                <a href="{doc_portal_url}" style="background-color: #0369a1; color: white; padding: 12px 26px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">
                                    Open Doctor Portal to Review Queue
                                </a>
                            </div>
                            <p style="text-align: center; font-size: 12px; color: #64748b; margin: 0 0 16px 0;">
                                Direct Portal Link: <a href="{doc_portal_url}" style="color: #0369a1; text-decoration: underline; font-family: monospace;">{doc_portal_url}</a>
                            </p>
                        </div>
                    </div>
                    """
                    self.dispatch_email(doc_email, subject, html)
                else:
                    logger.info(f"No active assistant or doctor emails found for doctor {appt.doctor_id}.")

            # Also notify patient that their request has been received and is under review
            patient_email = self._resolve_patient_email(appt)
            # Also notify patient that their request has been received and is under review
            patient_email = self._resolve_patient_email(appt)
            if patient_email:
                pat_subject = f"[DI Khan Care] Booking Request Received: {doc_name} (Slip #{appt.slip_number})"
                fee_val = appt.payment.amount if appt.payment else "1000"
                track_url = f"http://localhost:5173/track?slip={appt.slip_number}"
                pat_html = f"""
                <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="background-color: #0284c7; padding: 20px; color: white; text-align: center;">
                        <h2 style="margin: 0; font-size: 20px;">Appointment Request Received</h2>
                        <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Slip #{appt.slip_number} &middot; D.I. Khan Healthcare</p>
                    </div>
                    <div style="padding: 24px; background-color: #ffffff;">
                        <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
                            Dear <strong>{appt.patient_name}</strong>,
                        </p>
                        <p style="font-size: 14px; color: #475569; line-height: 1.5;">
                            Your consultation request for <strong>{doc_name}</strong> on <strong>{slot_date_str}</strong> at <strong>{slot_time_str} (PKT)</strong> has been successfully submitted and is currently <strong>Under Review</strong> by the clinic assistant desk.
                        </p>
                        <div style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 14px; margin: 16px 0;">
                            <div style="font-size: 13px; color: #334155;"><strong>Digital Slip Number:</strong> <code style="color: #0284c7; font-size: 14px; font-weight: bold;">#{appt.slip_number}</code></div>
                            <div style="font-size: 13px; color: #334155; margin-top: 6px;"><strong>Doctor:</strong> {doc_name}</div>
                            <div style="font-size: 13px; color: #334155; margin-top: 6px;"><strong>Consultation Slot:</strong> {slot_date_str} at {slot_time_str}</div>
                            <div style="font-size: 13px; color: #334155; margin-top: 6px;"><strong>Clinic Fee:</strong> Rs. {fee_val} (Pay cash at clinic)</div>
                        </div>

                        <div style="text-align: center; margin: 24px 0 14px 0;">
                            <a href="{track_url}" style="background-color: #0284c7; color: white; padding: 12px 26px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(2,132,199,0.3);">
                                🔍 Track My Appointment &amp; Queue Status
                            </a>
                        </div>
                        <p style="text-align: center; font-size: 12px; color: #64748b; margin: 0 0 16px 0;">
                            Direct Tracking Link: <a href="{track_url}" style="color: #0284c7; text-decoration: underline; font-family: monospace;">{track_url}</a>
                        </p>
                        <p style="font-size: 13px; color: #64748b; margin-top: 12px;">
                            You will receive another email confirmation as soon as the assistant confirms your appointment.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                        D.I. Khan Doctor Appointment System &middot; Patient Confirmation
                    </div>
                </div>
                """
                self.dispatch_email(patient_email, pat_subject, pat_html)
        except Exception as e:
            logger.error(f"Error in notify_appointment_requested: {e}")

    # -------------------------------------------------------------
    # EVENT 2a: Assistant confirms/approves appointment
    # -------------------------------------------------------------
    async def notify_appointment_confirmed(self, db: AsyncSession, appt: Appointment):
        """Notify assistant Gmail and patient when appointment is approved."""
        try:
            appt = await self._ensure_full_appointment(db, appt)
            assistant_emails = await self.get_assistant_emails_for_doctor(db, appt.doctor_id)
            doc_name = appt.doctor.user.full_name if appt.doctor and appt.doctor.user else "Doctor"
            slot_time_str = format_pkt_time(appt.slot.start_time) if appt.slot else "Scheduled"
            slot_date_str = format_pkt_date(appt.slot.start_time) if appt.slot else "Upcoming"

            desk_url = "http://localhost:5173/assistant"
            track_url = f"http://localhost:5173/track?slip={appt.slip_number}"

            # 1. Email for Assistant
            subject_assistant = f"[DI Khan Care] Appointment Confirmed: Slip #{appt.slip_number} - {appt.patient_name}"
            assistant_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="background-color: #059669; padding: 20px; color: white; text-align: center;">
                    <h2 style="margin: 0; font-size: 20px;">Appointment Confirmed</h2>
                    <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Slip #{appt.slip_number} &middot; Assistant Reception Desk</p>
                </div>
                <div style="padding: 24px; background-color: #ffffff;">
                    <p style="font-size: 14px; color: #334155; margin-top: 0;">
                        The digital appointment slip has been issued and confirmed in your clinic desk queue:
                    </p>
                    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; margin: 16px 0;">
                        <div style="font-size: 18px; font-weight: bold; color: #166534; text-align: center;">Slip #{appt.slip_number}</div>
                        <div style="font-size: 12px; color: #15803d; text-align: center; margin-top: 4px;">{slot_date_str} at {slot_time_str} (PKT)</div>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Patient:</td><td style="padding: 6px 0; font-weight: bold;">{appt.patient_name}</td></tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Phone:</td><td style="padding: 6px 0;">{appt.patient_phone}</td></tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Doctor:</td><td style="padding: 6px 0; font-weight: bold;">{doc_name}</td></tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Specialty:</td><td style="padding: 6px 0;">{appt.doctor.specialty if appt.doctor else 'General'}</td></tr>
                        <tr><td style="padding: 6px 0; color: #64748b;">Clinic:</td><td style="padding: 6px 0;">{appt.doctor.clinic_address if appt.doctor else 'D.I. Khan'}</td></tr>
                    </table>
                    <div style="text-align: center; margin: 24px 0 12px 0;">
                        <a href="{desk_url}" style="background-color: #059669; color: white; padding: 12px 26px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(5,150,105,0.25);">
                            📋 Open Assistant Reception Desk
                        </a>
                    </div>
                    <p style="text-align: center; font-size: 12px; color: #64748b; margin: 0;">
                        Direct Desk Link: <a href="{desk_url}" style="color: #059669; text-decoration: underline; font-family: monospace;">{desk_url}</a>
                    </p>
                </div>
                <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    D.I. Khan Doctor Appointment System &middot; Assistant Desk Notification
                </div>
            </div>
            """
            for email in assistant_emails:
                self.dispatch_email(email, subject_assistant, assistant_html)

            # 2. Email for Patient (with prominent TRACK APPOINTMENT link)
            patient_email = self._resolve_patient_email(appt)
            if patient_email:
                subject_patient = f"[DI Khan Care] Appointment Confirmed! Digital Slip #{appt.slip_number} - {doc_name}"
                fee_val = appt.payment.amount if appt.payment else "1000"
                patient_html = f"""
                <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="background-color: #059669; padding: 22px; color: white; text-align: center;">
                        <h2 style="margin: 0; font-size: 20px;">Your Appointment is Confirmed!</h2>
                        <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.95;">Digital Slip #{appt.slip_number} &middot; D.I. Khan Healthcare</p>
                    </div>
                    <div style="padding: 26px; background-color: #ffffff;">
                        <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
                            Dear <strong>{appt.patient_name}</strong>,
                        </p>
                        <p style="font-size: 14px; color: #334155; line-height: 1.5;">
                            Great news! Your medical appointment with <strong>{doc_name}</strong> has been officially confirmed by the clinic assistant.
                        </p>

                        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin: 18px 0; text-align: center;">
                            <div style="font-size: 12px; color: #166534; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Official Digital Slip Number</div>
                            <div style="font-size: 22px; font-weight: bold; color: #15803d; margin: 4px 0; font-family: monospace;">#{appt.slip_number}</div>
                            <div style="font-size: 13px; color: #166534; font-weight: bold;">{slot_date_str} at {slot_time_str} (PKT)</div>
                        </div>

                        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0;">
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 7px 0; color: #64748b; width: 130px;">Doctor:</td><td style="font-weight: bold; color: #0f172a;">{doc_name}</td></tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 7px 0; color: #64748b;">Specialty:</td><td style="color: #0f172a;">{appt.doctor.specialty if appt.doctor else 'Specialist'}</td></tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 7px 0; color: #64748b;">Clinic Address:</td><td style="color: #0f172a;">{appt.doctor.clinic_address if appt.doctor else 'Clinic, D.I. Khan'}</td></tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 7px 0; color: #64748b;">Consultation Fee:</td><td style="color: #0f172a; font-weight: bold;">Rs. {fee_val} (Pay cash at clinic desk)</td></tr>
                            <tr><td style="padding: 7px 0; color: #64748b;">Patient Contact:</td><td style="color: #0f172a;">{appt.patient_phone}</td></tr>
                        </table>

                        <!-- Prominent Track Appointment CTA -->
                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 22px 0; text-align: center;">
                            <p style="font-size: 14px; font-weight: bold; color: #0f172a; margin: 0 0 6px 0;">
                                Track Your Visit &amp; Live Queue Online
                            </p>
                            <p style="font-size: 12px; color: #64748b; margin: 0 0 14px 0;">
                                View your real-time queue number, doctor arrival status, and estimated consultation time anytime.
                            </p>
                            <a href="{track_url}" style="background-color: #059669; color: white; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 2px 5px rgba(5,150,105,0.3);">
                                🔍 Track My Appointment &amp; Live Queue
                            </a>
                        </div>

                        <p style="text-align: center; font-size: 12px; color: #64748b; margin: 0 0 14px 0;">
                            Direct Tracking Link: <a href="{track_url}" style="color: #059669; text-decoration: underline; font-family: monospace;">{track_url}</a>
                        </p>

                        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px; font-size: 12px; color: #92400e; margin-top: 14px;">
                            <strong>Clinic Instructions:</strong> Please arrive at the clinic 10-15 minutes before your scheduled slot. Show your slip number <strong>#{appt.slip_number}</strong> or your phone number at the reception desk.
                        </div>
                    </div>
                    <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                        D.I. Khan Doctor Appointment System &middot; Official Patient Confirmation
                    </div>
                </div>
                """
                self.dispatch_email(patient_email, subject_patient, patient_html)
        except Exception as e:
            logger.error(f"Error in notify_appointment_confirmed: {e}")

    # -------------------------------------------------------------
    # EVENT 2b: Assistant cancels/rejects appointment
    # -------------------------------------------------------------
    async def notify_appointment_cancelled(self, db: AsyncSession, appt: Appointment, reason: str = ""):
        """Notify assistant Gmail and patient when appointment is cancelled."""
        try:
            appt = await self._ensure_full_appointment(db, appt)
            assistant_emails = await self.get_assistant_emails_for_doctor(db, appt.doctor_id)
            doc_name = appt.doctor.user.full_name if appt.doctor and appt.doctor.user else "Doctor"

            desk_url = "http://localhost:5173/assistant"
            track_url = f"http://localhost:5173/track?slip={appt.slip_number or ''}"

            subject_assistant = f"[DI Khan Care] Appointment Cancelled: Slip #{appt.slip_number or 'N/A'} - {appt.patient_name}"
            assistant_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="background-color: #dc2626; padding: 20px; color: white; text-align: center;">
                    <h2 style="margin: 0; font-size: 20px;">Appointment Cancelled</h2>
                    <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Slip #{appt.slip_number or 'N/A'} &middot; Assistant Desk</p>
                </div>
                <div style="padding: 24px; background-color: #ffffff;">
                    <p style="font-size: 14px; color: #334155; margin-top: 0;">
                        The following appointment has been cancelled and its slot has been released back into available pool:
                    </p>
                    <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; font-size: 13px; color: #991b1b; margin: 14px 0;">
                        <strong>Cancellation Reason:</strong> {reason or 'Cancelled by clinic desk'}
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b; width: 120px;">Patient:</td><td style="font-weight: bold;">{appt.patient_name}</td></tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Phone:</td><td>{appt.patient_phone}</td></tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 6px 0; color: #64748b;">Doctor:</td><td>{doc_name}</td></tr>
                        <tr><td style="padding: 6px 0; color: #64748b;">Slip #:</td><td style="font-family: monospace; font-weight: bold;">#{appt.slip_number}</td></tr>
                    </table>
                    <div style="text-align: center; margin: 24px 0 12px 0;">
                        <a href="{desk_url}" style="background-color: #dc2626; color: white; padding: 12px 26px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">
                            📋 Open Assistant Reception Desk
                        </a>
                    </div>
                </div>
                <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    D.I. Khan Doctor Appointment System &middot; Assistant Desk Notification
                </div>
            </div>
            """
            for email in assistant_emails:
                self.dispatch_email(email, subject_assistant, assistant_html)

            # Patient cancellation notice
            patient_email = self._resolve_patient_email(appt)
            if patient_email:
                subject_patient = f"[DI Khan Care] Appointment Cancelled: Slip #{appt.slip_number or 'N/A'}"
                patient_html = f"""
                <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="background-color: #dc2626; padding: 20px; color: white; text-align: center;">
                        <h2 style="margin: 0; font-size: 20px;">Appointment Cancelled</h2>
                        <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Slip #{appt.slip_number or 'N/A'} &middot; D.I. Khan Healthcare</p>
                    </div>
                    <div style="padding: 24px; background-color: #ffffff;">
                        <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
                            Dear <strong>{appt.patient_name}</strong>,
                        </p>
                        <p style="font-size: 14px; color: #334155; line-height: 1.5;">
                            We regret to inform you that your appointment with <strong>{doc_name}</strong> has been cancelled.
                        </p>
                        <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; font-size: 13px; color: #991b1b; margin: 14px 0;">
                            <strong>Reason:</strong> {reason or 'Clinic schedule adjustment or patient request'}
                        </div>

                        <div style="text-align: center; margin: 24px 0 12px 0;">
                            <a href="{track_url}" style="background-color: #0284c7; color: white; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block; margin-right: 8px;">
                                🔍 Check Visit Status Online
                            </a>
                            <a href="http://localhost:5173" style="background-color: #059669; color: white; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block;">
                                📅 Book Another Appointment
                            </a>
                        </div>
                    </div>
                    <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                        D.I. Khan Doctor Appointment System &middot; Patient Notification
                    </div>
                </div>
                """
                self.dispatch_email(patient_email, subject_patient, patient_html)
        except Exception as e:
            logger.error(f"Error in notify_appointment_cancelled: {e}")

    # -------------------------------------------------------------
    # EVENT 3: 1-Hour Reminder before appointment booked time
    # -------------------------------------------------------------
    async def notify_appointment_reminder_1h(self, db: AsyncSession, appt: Appointment):
        """Send reminder 1 hour before scheduled consultation time."""
        try:
            appt = await self._ensure_full_appointment(db, appt)
            assistant_emails = await self.get_assistant_emails_for_doctor(db, appt.doctor_id)
            doc_name = appt.doctor.user.full_name if appt.doctor and appt.doctor.user else "Doctor"
            slot_time_str = format_pkt_time(appt.slot.start_time) if appt.slot else "1 Hour"
            slot_date_str = format_pkt_date(appt.slot.start_time) if appt.slot else "Today"

            desk_url = "http://localhost:5173/assistant"
            track_url = f"http://localhost:5173/track?slip={appt.slip_number}"

            # 1. Reminder for Assistant
            subject_assistant = f"[DI Khan Care] 1-Hour Reminder: {appt.patient_name} with {doc_name} at {slot_time_str} (Slip #{appt.slip_number})"
            assistant_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="background-color: #d97706; padding: 20px; color: white; text-align: center;">
                    <h2 style="margin: 0; font-size: 20px;">Patient Arrival in 1 Hour</h2>
                    <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Slip #{appt.slip_number} &middot; Assistant Desk Reminder</p>
                </div>
                <div style="padding: 24px; background-color: #ffffff;">
                    <p style="font-size: 14px; color: #334155; margin-top: 0;">
                        Patient <strong>{appt.patient_name}</strong> has a consultation scheduled with <strong>{doc_name}</strong> in approximately <strong>1 hour</strong> ({slot_time_str} PKT).
                    </p>
                    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; margin: 16px 0;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <tr style="border-bottom: 1px solid #fef3c7;"><td style="padding: 6px 0; color: #92400e; font-weight: bold; width: 120px;">Patient:</td><td style="font-weight: bold;">{appt.patient_name}</td></tr>
                            <tr style="border-bottom: 1px solid #fef3c7;"><td style="padding: 6px 0; color: #92400e; font-weight: bold;">Phone:</td><td>{appt.patient_phone}</td></tr>
                            <tr style="border-bottom: 1px solid #fef3c7;"><td style="padding: 6px 0; color: #92400e; font-weight: bold;">Scheduled:</td><td style="color: #b45309; font-weight: bold;">{slot_date_str} at {slot_time_str}</td></tr>
                            <tr><td style="padding: 6px 0; color: #92400e; font-weight: bold;">Digital Slip:</td><td style="font-family: monospace; font-weight: bold;">#{appt.slip_number}</td></tr>
                        </table>
                    </div>
                    <div style="text-align: center; margin: 24px 0 12px 0;">
                        <a href="{desk_url}" style="background-color: #d97706; color: white; padding: 12px 26px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block;">
                            📋 Open Assistant Reception Desk
                        </a>
                    </div>
                </div>
                <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    D.I. Khan Doctor Appointment System &middot; Assistant Desk Reminder
                </div>
            </div>
            """
            for email in assistant_emails:
                self.dispatch_email(email, subject_assistant, assistant_html)

            # 2. Reminder for Patient
            patient_email = self._resolve_patient_email(appt)
            if patient_email:
                subject_patient = f"[DI Khan Care] 1-Hour Reminder: Consultation with {doc_name} at {slot_time_str} (Slip #{appt.slip_number})"
                patient_html = f"""
                <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="background-color: #d97706; padding: 20px; color: white; text-align: center;">
                        <h2 style="margin: 0; font-size: 20px;">Your Consultation is in 1 Hour</h2>
                        <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Slip #{appt.slip_number} &middot; D.I. Khan Healthcare</p>
                    </div>
                    <div style="padding: 24px; background-color: #ffffff;">
                        <p style="font-size: 15px; color: #1e293b; margin-top: 0;">
                            Dear <strong>{appt.patient_name}</strong>,
                        </p>
                        <p style="font-size: 14px; color: #334155; line-height: 1.5;">
                            This is a reminder that your medical consultation with <strong>{doc_name}</strong> is scheduled in approximately <strong>1 hour</strong>.
                        </p>
                        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; margin: 16px 0; text-align: center;">
                            <div style="font-size: 17px; font-weight: bold; color: #92400e;">Scheduled Time: {slot_time_str} (PKT)</div>
                            <div style="font-size: 13px; color: #b45309; margin-top: 4px;">Doctor: {doc_name} ({appt.doctor.specialty if appt.doctor else 'Specialist'})</div>
                            <div style="font-size: 12px; color: #78350f; margin-top: 4px;">Slip Number: <strong>#{appt.slip_number}</strong></div>
                        </div>

                        <div style="text-align: center; margin: 22px 0 12px 0;">
                            <a href="{track_url}" style="background-color: #d97706; color: white; padding: 12px 26px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(217,119,6,0.25);">
                                🔍 Track Live Clinic Queue Position
                            </a>
                        </div>
                        <p style="text-align: center; font-size: 12px; color: #64748b; margin: 0 0 16px 0;">
                            Direct Tracking Link: <a href="{track_url}" style="color: #d97706; text-decoration: underline; font-family: monospace;">{track_url}</a>
                        </p>

                        <p style="font-size: 13px; color: #475569; margin-top: 14px;">
                            📍 <strong>Clinic Address:</strong> {appt.doctor.clinic_address if appt.doctor else 'D.I. Khan'}<br/>
                            ℹ️ Please arrive 10 minutes before your slot and present your slip number <strong>#{appt.slip_number}</strong> at reception.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                        D.I. Khan Doctor Appointment System &middot; Patient Reminder
                    </div>
                </div>
                """
                self.dispatch_email(patient_email, subject_patient, patient_html)
        except Exception as e:
            logger.error(f"Error in notify_appointment_reminder_1h: {e}")

    # -------------------------------------------------------------
    # EVENT 4: After doctor marks status COMPLETED
    # -------------------------------------------------------------
    async def notify_appointment_completed(self, db: AsyncSession, appt: Appointment, clinical_notes: str = ""):
        """Notify assistant Gmail and patient when consultation is completed, with review link."""
        try:
            appt = await self._ensure_full_appointment(db, appt)
            assistant_emails = await self.get_assistant_emails_for_doctor(db, appt.doctor_id)
            raw_name = (appt.doctor.user.full_name if appt.doctor and appt.doctor.user else "Doctor").strip()
            display_doc = raw_name if (raw_name.lower().startswith("dr.") or raw_name.lower().startswith("dr ")) else f"Dr. {raw_name}"
            slot_date_str = format_pkt_date(appt.slot.start_time) if (appt.slot and appt.slot.start_time) else format_pkt_date(appt.created_at)
            slot_time_str = format_pkt_time(appt.slot.start_time) if (appt.slot and appt.slot.start_time) else format_pkt_time(appt.created_at)
            review_url = f"http://localhost:5173/?doctor_id={appt.doctor_id}&review=1&slip={appt.slip_number or ''}"
            track_url = f"http://localhost:5173/track?slip={appt.slip_number or ''}"
            desk_url = "http://localhost:5173/assistant"

            subject_patient = f"[DI Khan Care] Visit Completed: {display_doc} on {slot_date_str} at {slot_time_str} - Leave a Review"
            patient_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="background-color: #0284c7; padding: 22px; color: white; text-align: center;">
                    <h2 style="margin: 0; font-size: 20px;">Consultation Completed</h2>
                    <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.95;">D.I. Khan Healthcare Portal &middot; Slip #{appt.slip_number}</p>
                </div>
                <div style="padding: 26px; background-color: #ffffff;">
                    <p style="font-size: 15px; color: #1e293b; line-height: 1.6; margin-top: 0;">
                        Dear <strong>{appt.patient_name}</strong>,
                    </p>
                    <p style="font-size: 15px; color: #334155; line-height: 1.6;">
                        You have completed your appointment with <strong>{display_doc}</strong> on <strong>{slot_date_str}</strong> at <strong>{slot_time_str}</strong>.
                    </p>

                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0;">
                        <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Appointment Details</div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px;">
                            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 6px 0; color: #64748b;">Doctor:</td><td style="font-weight: bold; color: #0f172a;">{display_doc} ({appt.doctor.specialty if appt.doctor else 'Specialist'})</td></tr>
                            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 6px 0; color: #64748b;">Date & Time:</td><td style="font-weight: bold; color: #0284c7;">{slot_date_str} at {slot_time_str} (PKT)</td></tr>
                            <tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 6px 0; color: #64748b;">Slip Number:</td><td style="font-family: monospace; font-weight: bold; color: #0f172a;">#{appt.slip_number}</td></tr>
                            <tr><td style="padding: 6px 0; color: #64748b;">Clinic:</td><td style="color: #475569;">{appt.doctor.clinic_address if appt.doctor else 'D.I. Khan'}</td></tr>
                        </table>
                    </div>

                    {f'<div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px; padding: 12px; font-size: 13px; color: #166534; margin: 16px 0;"><strong>Doctor Clinical Note:</strong><br/>{clinical_notes}</div>' if clinical_notes else ''}

                    <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 18px; margin: 24px 0; text-align: center;">
                        <p style="font-size: 15px; font-weight: bold; color: #92400e; margin: 0 0 8px 0;">
                            Do you want to mark a review for {display_doc}?
                        </p>
                        <p style="font-size: 12px; color: #b45309; margin: 0 0 16px 0;">
                            Your verified feedback helps other patients in Dera Ismail Khan find trusted medical care.
                        </p>
                        <a href="{review_url}" style="background-color: #0284c7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(2,132,199,0.3);">
                            ⭐ Mark a Review on Doctor Profile
                        </a>
                    </div>

                    <div style="text-align: center; margin: 20px 0 10px 0;">
                        <a href="{track_url}" style="background-color: #059669; color: white; padding: 11px 22px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(5,150,105,0.25);">
                            🔍 View Digital Slip &amp; Appointment History
                        </a>
                    </div>
                    <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 10px;">
                        Track Appointment Link: <a href="{track_url}" style="color: #059669;">{track_url}</a>
                    </p>
                </div>
                <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    D.I. Khan Doctor Appointment System &middot; Official Patient Notification
                </div>
            </div>
            """

            # Assistant desk notification
            subject_assistant = f"[DI Khan Care] Consultation Completed: {display_doc} · {appt.patient_name} (Slip #{appt.slip_number})"
            assistant_html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="background-color: #0284c7; padding: 20px; color: white; text-align: center;">
                    <h2 style="margin: 0; font-size: 20px;">Consultation Completed</h2>
                    <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Slip #{appt.slip_number} &middot; {appt.patient_name}</p>
                </div>
                <div style="padding: 24px; background-color: #ffffff;">
                    <p style="font-size: 14px; color: #334155; margin-top: 0;">
                        Doctor <strong>{display_doc}</strong> has completed the consultation appointment for <strong>{appt.patient_name}</strong> on <strong>{slot_date_str}</strong> at <strong>{slot_time_str}</strong>.
                    </p>
                    {f'<div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px; font-size: 13px; color: #334155; margin: 16px 0;"><strong>Doctor Note:</strong><br/>{clinical_notes}</div>' if clinical_notes else ''}
                    <p style="font-size: 13px; color: #64748b;">
                        Patient has been invited to submit a verified review via their email.
                    </p>

                    <div style="text-align: center; margin: 24px 0 12px 0;">
                        <a href="{desk_url}" style="background-color: #0284c7; color: white; padding: 12px 26px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(2,132,199,0.25);">
                            📋 Open Assistant Reception Desk
                        </a>
                    </div>
                    <p style="text-align: center; font-size: 12px; color: #64748b; margin: 0;">
                        Direct Desk Link: <a href="{desk_url}" style="color: #0284c7; text-decoration: underline; font-family: monospace;">{desk_url}</a>
                    </p>
                </div>
                <div style="background-color: #f8fafc; padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    D.I. Khan Doctor Appointment System &middot; Assistant Desk Notification
                </div>
            </div>
            """

            for email in assistant_emails:
                self.dispatch_email(email, subject_assistant, assistant_html)

            patient_email = self._resolve_patient_email(appt)
            if patient_email:
                self.dispatch_email(patient_email, subject_patient, patient_html)
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
