"""
Digital Slip Number Service for D.I. Khan clinics.
Generates reception-friendly identifiers: DIK-[SPECIALTY/DOCTOR]-[YYYYMMDD]-[SEQ]
Example: DIK-CARD-20260930-014
"""

from datetime import datetime, timezone
import random
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from app.models import Appointment, DoctorSlot
from app.core.timezone import PKT, to_pkt

class SlipService:
    @staticmethod
    def get_specialty_code(specialty: Optional[str]) -> str:
        if not specialty:
            return "GEN"
        s = specialty.upper()
        if "CARDIO" in s:
            return "CARD"
        elif "GYNE" in s or "OBSTET" in s:
            return "GYNE"
        elif "PEDIAT" in s or "CHILD" in s:
            return "PED"
        elif "ORTHO" in s:
            return "ORTH"
        elif "DERMA" in s:
            return "DERM"
        return "GEN"

    @staticmethod
    def is_valid_sequential_slip(slip_number: Optional[str]) -> bool:
        if not slip_number or not isinstance(slip_number, str):
            return False
        parts = slip_number.strip().split("-")
        return len(parts) >= 5 and parts[3].isdigit() and len(parts[3]) <= 3 and int(parts[3]) > 0

    @classmethod
    async def generate_slip_number(
        cls,
        db: AsyncSession,
        doctor_id: Optional[str] = None,
        visit_date: Optional[datetime] = None,
        specialty: Optional[str] = "General",
        slot_id: Optional[str] = None
    ) -> str:
        """
        Generates a human-friendly unique digital slip number:
        DIK-[SPECIALTY]-[YYYYMMDD]-[SEQ_NUM:03d]-[JITTER]
        
        Queue numbers are strictly arranged:
        - When a slot is booked, the queue/token number matches that day's slot number (#1, #2, #3...)
        - Otherwise, sequential count per doctor per date
        """
        visit_dt = to_pkt(visit_date) or datetime.now(PKT)
        date_str = visit_dt.strftime("%Y%m%d")
        # Backwards compatibility: Check if doctor_id parameter was passed as specialty name (e.g. from test suite)
        if doctor_id and not visit_date and (specialty == "General" or specialty is None):
            code = cls.get_specialty_code(doctor_id)
            if code != "GEN" or any(k in doctor_id.upper() for k in ["GENERAL", "MEDICINE", "SURGERY"]):
                specialty = doctor_id
                doctor_id = None

        prefix = cls.get_specialty_code(specialty)

        max_seq = 0
        active_count = 0
        daily_slot_seq: Optional[int] = None

        if doctor_id:
            # Calendar day boundary in UTC corresponding to PKT visit day
            day_start_pkt = datetime(visit_dt.year, visit_dt.month, visit_dt.day, 0, 0, 0, tzinfo=PKT)
            day_end_pkt = datetime(visit_dt.year, visit_dt.month, visit_dt.day, 23, 59, 59, 999999, tzinfo=PKT)
            day_start = day_start_pkt.astimezone(timezone.utc)
            day_end = day_end_pkt.astimezone(timezone.utc)

            # If slot_id is provided, check if it matches the slot's daily sequence index
            if slot_id:
                slots_res = await db.execute(
                    select(DoctorSlot.id)
                    .where(
                        DoctorSlot.doctor_id == doctor_id,
                        DoctorSlot.start_time >= day_start,
                        DoctorSlot.start_time <= day_end
                    )
                    .order_by(DoctorSlot.start_time.asc())
                )
                day_slot_ids = [r[0] for r in slots_res.all()]
                if slot_id in day_slot_ids:
                    daily_slot_seq = day_slot_ids.index(slot_id) + 1

            # Query all appointments for this doctor on this visit date
            query = (
                select(Appointment.slip_number, Appointment.status)
                .join(DoctorSlot, Appointment.slot_id == DoctorSlot.id, isouter=True)
                .where(
                    Appointment.doctor_id == doctor_id,
                    or_(
                        and_(DoctorSlot.start_time >= day_start, DoctorSlot.start_time <= day_end),
                        Appointment.slip_number.like(f"DIK-%-{date_str}-%")
                    )
                )
            )
            result = await db.execute(query)
            rows = result.all()

            for s_num, status in rows:
                if status not in ("CANCELLED", "REJECTED"):
                    active_count += 1
                if s_num:
                    parts = s_num.strip().split("-")
                    # Official slip format: DIK-[SPECIALTY]-[YYYYMMDD]-[SEQ_NUM:03d]-[JITTER]
                    if len(parts) >= 4 and parts[3].isdigit():
                        try:
                            num = int(parts[3])
                            if 1 <= num <= 999 and num > max_seq:
                                max_seq = num
                        except ValueError:
                            pass
        else:
            # Fallback if doctor_id is not specified: query by prefix and date
            query = select(Appointment.slip_number).where(
                Appointment.slip_number.like(f"DIK-{prefix}-{date_str}-%")
            )
            result = await db.execute(query)
            existing_slips = result.scalars().all()
            for s in existing_slips:
                if not s:
                    continue
                parts = s.strip().split("-")
                if len(parts) >= 4 and parts[3].isdigit():
                    try:
                        num = int(parts[3])
                        if 1 <= num <= 999 and num > max_seq:
                            max_seq = num
                    except ValueError:
                        pass

        if daily_slot_seq is not None:
            seq_num = daily_slot_seq
        else:
            seq_num = max(max_seq, active_count) + 1

        # Generate unique candidate with 2-digit jitter, retrying if duplicate collision
        jitter = random.randint(10, 99)
        while True:
            candidate = f"DIK-{prefix}-{date_str}-{seq_num:03d}-{jitter}"
            exists = (await db.execute(select(Appointment.id).where(Appointment.slip_number == candidate))).scalar_one_or_none()
            if not exists:
                return candidate
            jitter = random.randint(10, 99)

slip_service = SlipService()
