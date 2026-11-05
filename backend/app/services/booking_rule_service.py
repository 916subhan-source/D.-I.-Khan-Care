"""
Booking validation and business rule enforcement service:
- Daily 1 appointment per phone number limit per doctor:
  A patient cannot book more than one active appointment with the same doctor
  on the same calendar day (PKT timezone).
"""

import re
from datetime import datetime, timezone
from typing import Optional, List, Tuple, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import selectinload

from app.models import Appointment, DoctorSlot, User, Doctor
from app.core.timezone import PKT, to_pkt, format_pkt_date, format_pkt_time

ACTIVE_APPOINTMENT_STATUSES = [
    "PENDING_ASSISTANT_APPROVAL",
    "CONFIRMED",
    "IN_PROGRESS",
    "COMPLETED",
    "HOLD"
]


def normalize_phone_number(phone: Optional[str]) -> str:
    """
    Normalizes a phone number to its core comparison digits.
    In Pakistan, all mobile numbers have 10 core digits after the country/trunk prefix:
      +92 300 1234567 -> 3001234567
      0300 1234567    -> 3001234567
      03001234567     -> 3001234567
      923001234567    -> 3001234567
      00923001234567  -> 3001234567
      3001234567      -> 3001234567
    """
    if not phone:
        return ""
    digits = re.sub(r"\D", "", str(phone).strip())
    if len(digits) >= 10:
        return digits[-10:]
    return digits


class BookingRuleService:
    @classmethod
    def get_pkt_day_bounds_utc(cls, visit_date_or_slot_time: Union[datetime, str]) -> Tuple[datetime, datetime]:
        """
        Calculates the exact UTC start and end timestamps representing 
        00:00:00 to 23:59:59.999999 of the PKT (UTC+5) calendar day.
        """
        visit_dt = to_pkt(visit_date_or_slot_time) or datetime.now(PKT)
        day_start_pkt = datetime(visit_dt.year, visit_dt.month, visit_dt.day, 0, 0, 0, tzinfo=PKT)
        day_end_pkt = datetime(visit_dt.year, visit_dt.month, visit_dt.day, 23, 59, 59, 999999, tzinfo=PKT)
        return (
            day_start_pkt.astimezone(timezone.utc),
            day_end_pkt.astimezone(timezone.utc)
        )

    @classmethod
    async def check_daily_phone_limit(
        cls,
        db: AsyncSession,
        doctor_id: str,
        visit_date_or_slot_time: Union[datetime, str],
        phone: Optional[str],
        additional_phones: Optional[List[Optional[str]]] = None,
        exclude_appointment_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str], Optional[Appointment]]:
        """
        Checks whether any of the provided candidate phones already has an active
        appointment with the given doctor on the specified PKT calendar day.

        Returns:
            (is_allowed: bool, error_message: Optional[str], conflicting_appointment: Optional[Appointment])
            - True, None, None if booking is allowed.
            - False, err_msg, appt if a duplicate active appointment was found.
        """
        all_candidate_raw = [phone]
        if additional_phones:
            all_candidate_raw.extend(additional_phones)

        candidate_normalized = {
            normalize_phone_number(p) for p in all_candidate_raw if p and normalize_phone_number(p)
        }

        if not candidate_normalized:
            # No valid phone provided to check against
            return True, None, None

        day_start_utc, day_end_utc = cls.get_pkt_day_bounds_utc(visit_date_or_slot_time)

        # Query all active appointments for this doctor that fall on this PKT day
        query = (
            select(Appointment)
            .outerjoin(DoctorSlot, Appointment.slot_id == DoctorSlot.id)
            .options(
                selectinload(Appointment.slot),
                selectinload(Appointment.patient),
                selectinload(Appointment.doctor).selectinload(Doctor.user)
            )
            .where(
                Appointment.doctor_id == doctor_id,
                Appointment.status.in_(ACTIVE_APPOINTMENT_STATUSES),
                or_(
                    and_(
                        DoctorSlot.start_time >= day_start_utc,
                        DoctorSlot.start_time <= day_end_utc
                    ),
                    and_(
                        Appointment.slot_id.is_(None),
                        Appointment.created_at >= day_start_utc,
                        Appointment.created_at <= day_end_utc
                    )
                )
            )
        )

        if exclude_appointment_id:
            query = query.where(Appointment.id != exclude_appointment_id)

        result = await db.execute(query)
        existing_appts = result.scalars().all()

        for appt in existing_appts:
            existing_phones = [appt.patient_phone, appt.loyalty_mobile]
            if appt.patient:
                existing_phones.extend([appt.patient.phone, appt.patient.whatsapp_number])

            for ep in existing_phones:
                norm_ep = normalize_phone_number(ep)
                if norm_ep and norm_ep in candidate_normalized:
                    # Conflicting active appointment found on this day for this doctor!
                    date_str = format_pkt_date(visit_date_or_slot_time)
                    slip_display = appt.slip_number or "Active Booking"
                    time_str = ""
                    if appt.slot and appt.slot.start_time:
                        time_str = f" at {format_pkt_time(appt.slot.start_time)}"

                    doc_name = ""
                    if appt.doctor and appt.doctor.user and appt.doctor.user.full_name:
                        doc_name = f" with {appt.doctor.user.full_name}"

                    err_msg = (
                        f"Only one appointment per phone number is allowed per day for this doctor. "
                        f"An active appointment ({slip_display}{time_str}{doc_name}) is already booked "
                        f"for this phone number on {date_str}."
                    )
                    return False, err_msg, appt

        return True, None, None


booking_rule_service = BookingRuleService()
