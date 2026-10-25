"""
Assistant Portal & Reception Desk Endpoints:
- Multi-Doctor Switcher: list all doctors linked to current assistant
- Live Queue: fetch verified incoming requests for selected doctor(s)
- Approval: locks slot, marks CONFIRMED, issues Digital Slip Number
- Smart Reschedule: resolves collisions, reassigns alternate slot with notes
- Rejection: declines request with reason
- Cash Desk: marks PENDING_CASH -> PAID, records audit log
"""

import re
import json
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.services.slip_service import slip_service
from app.services.audit_service import audit_service
from app.models import User, Doctor, DoctorAssistant, DoctorSlot, Appointment, Payment
from app.schemas import AppointmentResponse, RescheduleRequest, MarkPaidRequest, POSBookingRequest, EmergencySlotRequest
from app.core.timezone import format_pkt_date, format_pkt_time, format_pkt_ymd, PKT, to_pkt

def parse_token_from_slip_str(slip_number: Optional[str]) -> Optional[int]:
    if not slip_number or not isinstance(slip_number, str):
        return None
    parts = slip_number.strip().split("-")
    if len(parts) >= 4 and parts[3].isdigit():
        try:
            num = int(parts[3])
            if 1 <= num <= 999:
                return num
        except ValueError:
            pass
    return None

router = APIRouter(prefix="/assistant", tags=["Assistant Desk"])

async def verify_assistant_doctor_access(current_user: User, doctor_id: str, db: AsyncSession):
    """Verifies that an assistant or doctor user is authorized to manage appointments for a doctor."""
    if current_user.role == "ADMIN":
        return True
    if current_user.role == "DOCTOR":
        doc = (await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))).scalar_one_or_none()
        if not doc or doc.id != doctor_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized for this doctor.")
        return True

    link_check = await db.execute(
        select(DoctorAssistant).where(
            and_(
                DoctorAssistant.doctor_id == doctor_id,
                DoctorAssistant.assistant_user_id == current_user.id,
                DoctorAssistant.status == "active"
            )
        )
    )
    if not link_check.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized to manage appointments for this doctor.")
    return True


@router.get("/my-doctors")
async def get_linked_doctors(
    current_user: User = Depends(require_roles(["ASSISTANT", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Multi-Doctor Switcher: Returns all doctors linked to this assistant account.
    Enables shared receptionists in polyclinics to toggle contexts seamlessly.
    """
    if current_user.role == "ADMIN":
        query = select(Doctor).options(selectinload(Doctor.user))
    else:
        query = select(Doctor).join(DoctorAssistant, Doctor.id == DoctorAssistant.doctor_id)\
            .options(selectinload(Doctor.user))\
            .where(
                and_(
                    DoctorAssistant.assistant_user_id == current_user.id,
                    DoctorAssistant.status == "active"
                )
            )

    result = await db.execute(query)
    doctors = result.scalars().all()

    # If assistant has 0 linked doctors, return empty list [] so the portal displays the unlinked guidance instead of kicking them out
    if current_user.role == "ASSISTANT" and len(doctors) == 0:
        return []

    return [
        {
            "doctor_id": doc.id,
            "doctor_name": doc.user.full_name if doc.user else "Specialist Doctor",
            "specialty": doc.specialty,
            "clinic_address": doc.clinic_address,
            "fee_clinic": float(doc.fee_clinic),
            "shift": doc.shift,
            "morning_start": doc.morning_start or "09:00",
            "morning_end": doc.morning_end or "13:00",
            "evening_start": doc.evening_start or "17:00",
            "evening_end": doc.evening_end or "21:00",
            "off_days": doc.off_days or "sunday"
        }
        for doc in doctors
    ]


@router.get("/queue", response_model=List[AppointmentResponse])
async def get_queue(
    doctor_id: Optional[str] = Query(None, description="Filter queue by selected doctor"),
    status_filter: Optional[str] = Query(None, description="PENDING_ASSISTANT_APPROVAL, CONFIRMED, etc."),
    include_archived: bool = Query(False, description="Whether to include closed visits older than 2 days"),
    current_user: User = Depends(require_roles(["ASSISTANT", "ADMIN", "DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Live Queue for Assistant Desk.
    Strictly scoped to the assistant's assigned doctor(s).
    By default, closed visits (COMPLETED, CANCELLED, REJECTED) older than 2 days are excluded.
    """
    query = select(Appointment).outerjoin(
        DoctorSlot, Appointment.slot_id == DoctorSlot.id
    ).options(
        selectinload(Appointment.doctor).selectinload(Doctor.user),
        selectinload(Appointment.patient),
        selectinload(Appointment.slot),
        selectinload(Appointment.payment)
    )

    if current_user.role == "ASSISTANT":
        linked_res = await db.execute(
            select(DoctorAssistant.doctor_id).where(
                and_(
                    DoctorAssistant.assistant_user_id == current_user.id,
                    DoctorAssistant.status == "active"
                )
            )
        )
        linked_doctor_ids = linked_res.scalars().all()
        if not linked_doctor_ids:
            return []

        if doctor_id:
            if doctor_id not in linked_doctor_ids:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not authorized for this doctor.")
            query = query.where(Appointment.doctor_id == doctor_id)
        else:
            query = query.where(Appointment.doctor_id.in_(linked_doctor_ids))
    elif current_user.role == "DOCTOR":
        doc = (await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))).scalar_one_or_none()
        if not doc:
            return []
        query = query.where(Appointment.doctor_id == doc.id)
    else:  # ADMIN
        if doctor_id:
            query = query.where(Appointment.doctor_id == doctor_id)

    if status_filter:
        query = query.where(Appointment.status == status_filter)

    if not include_archived:
        # Hide all past consultations before today by default in Pakistan Standard Time (UTC+5)
        now_pkt = datetime.now(timezone(timedelta(hours=5)))
        today_start_pkt = datetime(now_pkt.year, now_pkt.month, now_pkt.day, 0, 0, 0, tzinfo=timezone(timedelta(hours=5)))
        today_start_utc = today_start_pkt.astimezone(timezone.utc)
        appt_time = func.coalesce(DoctorSlot.start_time, Appointment.created_at)
        query = query.where(appt_time >= today_start_utc)


    query = query.order_by(Appointment.created_at.desc())

    result = await db.execute(query)
    appointments = result.scalars().all()

    items = []
    for appt in appointments:
        items.append({
            "id": appt.id,
            "patient_id": appt.patient_id,
            "doctor_id": appt.doctor_id,
            "slot_id": appt.slot_id,
            "status": appt.status,
            "slip_number": appt.slip_number,
            "notes": appt.notes,
            "reschedule_reason": appt.reschedule_reason,
            "created_at": appt.created_at,
            "patient_name": appt.patient_name or (appt.patient.full_name if appt.patient else "Patient"),
            "patient_phone": appt.patient_phone or (appt.patient.phone if appt.patient else "N/A"),
            "doctor_name": appt.doctor.user.full_name if appt.doctor and appt.doctor.user else "Doctor",
            "slot_start": appt.slot.start_time if appt.slot else None,
            "start_time": appt.slot.start_time.isoformat() if appt.slot and appt.slot.start_time else None,
            "slot_date": (
                format_pkt_date(appt.slot.start_time) if appt.slot and appt.slot.start_time else (
                    format_pkt_date(datetime(int(re.search(r"(\d{4})(\d{2})(\d{2})", appt.slip_number).group(1)), int(re.search(r"(\d{4})(\d{2})(\d{2})", appt.slip_number).group(2)), int(re.search(r"(\d{4})(\d{2})(\d{2})", appt.slip_number).group(3)), 0, 0, tzinfo=timezone.utc))
                    if appt.slip_number and re.search(r"(\d{4})(\d{2})(\d{2})", appt.slip_number)
                    else (format_pkt_date(appt.created_at) if appt.created_at else None)
                )
            ),
            "slot_time": (
                format_pkt_time(appt.slot.start_time) if appt.slot and appt.slot.start_time else (
                    "Slot Released" if appt.status in ("REJECTED", "CANCELLED") else None
                )
            ),
            "payment_status": appt.payment.status if appt.payment else "PENDING_CASH",
            "fee_amount": float(appt.payment.amount) if appt.payment else float(appt.doctor.fee_clinic if appt.doctor else 1000.00),
            "token_number": parse_token_from_slip_str(appt.slip_number)
        })
    return items


@router.post("/appointments/{appointment_id}/approve", response_model=AppointmentResponse)
async def approve_appointment(
    appointment_id: str,
    current_user: User = Depends(require_roles(["ASSISTANT", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    query = select(Appointment).options(
        selectinload(Appointment.doctor).selectinload(Doctor.user),
        selectinload(Appointment.patient),
        selectinload(Appointment.slot),
        selectinload(Appointment.payment)
    ).where(Appointment.id == appointment_id)

    result = await db.execute(query)
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    await verify_assistant_doctor_access(current_user, appt.doctor_id, db)

    old_status = appt.status
    if not appt.slip_number or not slip_service.is_valid_sequential_slip(appt.slip_number):
        visit_date = appt.slot.start_time if appt.slot and appt.slot.start_time else appt.created_at
        slip_num = await slip_service.generate_slip_number(
            db=db,
            doctor_id=appt.doctor_id,
            visit_date=visit_date,
            specialty=appt.doctor.specialty if appt.doctor else "General",
            slot_id=appt.slot_id
        )
        appt.slip_number = slip_num
    else:
        slip_num = appt.slip_number

    appt.status = "CONFIRMED"
    appt.assistant_id = current_user.id
    
    if appt.slot:
        appt.slot.status = "booked"

    await audit_service.log_action(
        db=db,
        actor_id=current_user.id,
        action="APPROVE_BOOKING",
        entity="Appointment",
        entity_id=appt.id,
        before_value=old_status,
        after_value=f"CONFIRMED (Slip: {slip_num})"
    )

    await db.commit()

    # Trigger Event 2a: Notify assistant Gmail & patient of confirmation
    try:
        from app.services.notification_service import notification_service
        await notification_service.notify_appointment_confirmed(db, appt)
    except Exception as notify_err:
        import logging
        logging.getLogger("assistants").warning(f"Notification error on approve: {notify_err}")

    return {
        "id": appt.id,
        "patient_id": appt.patient_id,
        "doctor_id": appt.doctor_id,
        "slot_id": appt.slot_id,
        "status": appt.status,
        "slip_number": appt.slip_number,
        "notes": appt.notes,
        "reschedule_reason": appt.reschedule_reason,
        "created_at": appt.created_at,
        "patient_name": appt.patient_name or (appt.patient.full_name if appt.patient else "Patient"),
        "patient_phone": appt.patient_phone or (appt.patient.phone if appt.patient else "N/A"),
        "doctor_name": appt.doctor.user.full_name if appt.doctor and appt.doctor.user else "Doctor",
        "slot_start": appt.slot.start_time if appt.slot else None,
        "start_time": appt.slot.start_time.isoformat() if appt.slot and appt.slot.start_time else None,
        "slot_date": format_pkt_date(appt.slot.start_time) if appt.slot and appt.slot.start_time else None,
        "slot_time": format_pkt_time(appt.slot.start_time) if appt.slot and appt.slot.start_time else None,
        "payment_status": appt.payment.status if appt.payment else "PENDING_CASH",
        "fee_amount": appt.payment.amount if appt.payment else 1000.00,
        "token_number": parse_token_from_slip_str(appt.slip_number)
    }


@router.post("/appointments/{appointment_id}/cancel")
async def cancel_appointment_by_assistant(
    appointment_id: str,
    reason: str = Query("Patient requested cancellation"),
    current_user: User = Depends(require_roles(["ASSISTANT", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    query = select(Appointment).options(
        selectinload(Appointment.doctor).selectinload(Doctor.user),
        selectinload(Appointment.patient),
        selectinload(Appointment.slot)
    ).where(Appointment.id == appointment_id)

    result = await db.execute(query)
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    await verify_assistant_doctor_access(current_user, appt.doctor_id, db)

    if appt.status in ("COMPLETED", "CANCELLED"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel appointment with status {appt.status}.")

    old_status = appt.status
    appt.status = "CANCELLED"
    appt.notes = f"Cancelled by Assistant: {reason}"

    if appt.slot:
        appt.slot.status = "available"

    await audit_service.log_action(
        db=db,
        actor_id=current_user.id,
        action="CANCEL_APPOINTMENT",
        entity="Appointment",
        entity_id=appt.id,
        before_value=old_status,
        after_value=f"CANCELLED ({reason})"
    )

    await db.commit()

    # Trigger Event 2b: Notify assistant Gmail & patient of cancellation
    try:
        from app.services.notification_service import notification_service
        await notification_service.notify_appointment_cancelled(db, appt, reason=reason)
    except Exception as notify_err:
        import logging
        logging.getLogger("assistants").warning(f"Notification error on cancel: {notify_err}")

    return {"status": "SUCCESS", "message": "Appointment cancelled and slot released to available.", "appointment_id": appt.id}


@router.post("/appointments/{appointment_id}/reschedule")
async def reschedule_appointment(
    appointment_id: str,
    payload: RescheduleRequest,
    current_user: User = Depends(require_roles(["ASSISTANT", "ADMIN", "DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    appt = (await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.doctor))
        .where(Appointment.id == appointment_id)
    )).scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    await verify_assistant_doctor_access(current_user, appt.doctor_id, db)

    new_slot = (await db.execute(select(DoctorSlot).where(DoctorSlot.id == payload.new_slot_id))).scalar_one_or_none()
    if not new_slot or new_slot.status != "available":
        raise HTTPException(status_code=400, detail="Requested new slot is not available.")

    # 45-minute notice buffer: Cannot reschedule into a slot starting in less than 45 minutes on today's date
    if new_slot.start_time:
        pkt_tz = timezone(timedelta(hours=5))
        now_pkt = datetime.now(pkt_tz)
        slot_dt = new_slot.start_time
        if slot_dt.tzinfo is None:
            slot_dt = slot_dt.replace(tzinfo=pkt_tz)
        if slot_dt.date() == now_pkt.date() and slot_dt < (now_pkt + timedelta(minutes=45)):
            raise HTTPException(
                status_code=400,
                detail="Cannot reschedule into a slot starting in less than 45 minutes. A minimum 45-minute notice buffer is required."
            )


    if appt.slot_id:
        old_slot = (await db.execute(select(DoctorSlot).where(DoctorSlot.id == appt.slot_id))).scalar_one_or_none()
        if old_slot:
            old_slot.status = "available"

    old_slot_id = appt.slot_id
    appt.slot_id = new_slot.id
    new_slot.status = "booked" if appt.status == "CONFIRMED" else "hold"
    appt.reschedule_reason = payload.reason

    # If rescheduled to a different calendar date, update slip to sequential queue on that new date
    new_date_str = format_pkt_ymd(new_slot.start_time) if new_slot.start_time else None
    if new_date_str and (not appt.slip_number or new_date_str not in appt.slip_number):
        appt.slip_number = await slip_service.generate_slip_number(
            db=db,
            doctor_id=appt.doctor_id,
            visit_date=new_slot.start_time,
            specialty=appt.doctor.specialty if appt.doctor else "General"
        )

    await audit_service.log_action(
        db=db,
        actor_id=current_user.id,
        action="RESCHEDULE",
        entity="Appointment",
        entity_id=appt.id,
        before_value=f"Slot: {old_slot_id}",
        after_value=f"New Slot: {new_slot.id} (Reason: {payload.reason})"
    )

    await db.commit()

    try:
        from app.core.redis import redis_manager
        await redis_manager.clear_cache_pattern(f"doctor_slots:{appt.doctor_id}")
        await redis_manager.clear_cache_pattern("doctors:")
    except Exception:
        pass

    return {
        "status": "SUCCESS",
        "message": "Appointment rescheduled successfully.",
        "new_slot_id": new_slot.id,
        "slip_number": appt.slip_number
    }


@router.post("/appointments/{appointment_id}/reject")
async def reject_appointment(
    appointment_id: str,
    reason: Optional[str] = None,
    current_user: User = Depends(require_roles(["ASSISTANT", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    appt = (await db.execute(
        select(Appointment).options(selectinload(Appointment.slot)).where(Appointment.id == appointment_id)
    )).scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    await verify_assistant_doctor_access(current_user, appt.doctor_id, db)

    if appt.status not in ("PENDING_ASSISTANT_APPROVAL", "HOLD"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject an appointment with status '{appt.status}'."
        )

    old_status = appt.status
    appt.status = "REJECTED"
    appt.notes = reason or "Rejected by clinic assistant."
    appt.assistant_id = current_user.id

    if appt.slot:
        appt.slot.status = "available"

    await audit_service.log_action(
        db=db,
        actor_id=current_user.id,
        action="REJECT_BOOKING",
        entity="Appointment",
        entity_id=appt.id,
        before_value=old_status,
        after_value=f"REJECTED (Reason: {appt.notes})"
    )

    await db.commit()
    return {
        "status": "SUCCESS",
        "appointment_id": appt.id,
        "appointment_status": "REJECTED",
        "reason": appt.notes
    }


@router.post("/appointments/{appointment_id}/mark-paid")
async def mark_appointment_paid(
    appointment_id: str,
    payload: Optional[MarkPaidRequest] = None,
    current_user: User = Depends(require_roles(["ASSISTANT", "ADMIN", "DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    payment_res = await db.execute(
        select(Payment).options(selectinload(Payment.appointment)).where(Payment.appointment_id == appointment_id)
    )
    payment = payment_res.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record for this appointment not found.")

    await verify_assistant_doctor_access(current_user, payment.appointment.doctor_id, db)

    if payment.status == "PAID":
        return {"status": "ALREADY_PAID", "message": "This consultation fee is already marked as PAID."}

    old_status = payment.status
    payment.status = "PAID"
    payment.paid_at = datetime.now(timezone.utc)
    payment.collected_by = current_user.id

    await audit_service.log_action(
        db=db,
        actor_id=current_user.id,
        action="CASH_PAYMENT_COLLECTED",
        entity="Payment",
        entity_id=payment.id,
        before_value=old_status,
        after_value=f"PAID (Amount: Rs. {payment.amount}) by Assistant #{current_user.full_name}"
    )

    await db.commit()
    return {
        "status": "SUCCESS",
        "payment_status": "PAID",
        "amount": float(payment.amount),
        "paid_at": payment.paid_at.isoformat(),
        "collected_by": current_user.full_name
    }


@router.post("/appointments/{appointment_id}/complete")
async def complete_appointment_by_assistant(
    appointment_id: str,
    consultation_notes: Optional[str] = Query(None, description="Remarks or notes"),
    current_user: User = Depends(require_roles(["ASSISTANT", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Assistant marks consultation as completed."""
    query = select(Appointment).options(
        selectinload(Appointment.doctor).selectinload(Doctor.user),
        selectinload(Appointment.patient),
        selectinload(Appointment.slot),
        selectinload(Appointment.payment)
    ).where(Appointment.id == appointment_id)
    result = await db.execute(query)
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    await verify_assistant_doctor_access(current_user, appt.doctor_id, db)

    if appt.status in ("COMPLETED", "CANCELLED", "REJECTED"):
        raise HTTPException(status_code=400, detail=f"Appointment already has status {appt.status}.")

    if appt.status != "CONFIRMED":
        raise HTTPException(
            status_code=400,
            detail=f"Only confirmed appointments can be marked as completed (current status: {appt.status})."
        )

    # Governance rule: Payment must be collected at reception Cash Desk before consultation can be completed
    if not appt.payment or appt.payment.status != "PAID":
        fee_str = f"Rs. {appt.payment.amount:,.0f}" if appt.payment else "consultation fee"
        raise HTTPException(
            status_code=400,
            detail=f"Payment Pending: Patient has not paid the {fee_str} at the reception Cash Desk yet. Fee must be collected before completing consultation."
        )


    # Restrict completion: appointment must be scheduled for today or a past date
    if appt.slot and appt.slot.start_time:
        slot_time = appt.slot.start_time
        if slot_time.tzinfo is None:
            slot_time = slot_time.replace(tzinfo=timezone.utc)
        now_utc = datetime.now(timezone.utc)
        slot_pkt_ymd = format_pkt_ymd(slot_time)
        now_pkt_ymd = format_pkt_ymd(now_utc)
        if slot_pkt_ymd > now_pkt_ymd:
            f_d = format_pkt_date(slot_time)
            raise HTTPException(
                status_code=400,
                detail=f"Cannot mark consultation as completed before its scheduled calendar date ({f_d}) has arrived."
            )

    old_status = appt.status
    appt.status = "COMPLETED"
    if consultation_notes:
        appt.notes = f"{appt.notes or ''} [Notes: {consultation_notes}]".strip()

    await audit_service.log_action(
        db=db,
        actor_id=current_user.id,
        action="ASSISTANT_COMPLETE_APPOINTMENT",
        entity="Appointment",
        entity_id=appt.id,
        before_value=old_status,
        after_value="COMPLETED"
    )

    await db.commit()

    try:
        from app.services.notification_service import notification_service
        await notification_service.notify_appointment_completed(db, appt, clinical_notes=consultation_notes)
    except Exception as notify_err:
        import logging
        logging.getLogger("assistants").warning(f"Notification error on complete: {notify_err}")

    return {"status": "SUCCESS", "message": "Consultation marked as completed.", "appointment_id": appt.id}


@router.get("/patients/lookup")
async def lookup_patients(
    query: str = Query(..., min_length=2, description="Search phone number or name"),
    current_user: User = Depends(require_roles(["ASSISTANT", "ADMIN", "DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """Fast auto-lookup for returning patients by phone or full name."""
    clean_q = query.strip()
    stmt = (
        select(User)
        .where(
            and_(
                User.role == "PATIENT",
                or_(
                    User.phone.like(f"%{clean_q}%"),
                    User.full_name.ilike(f"%{clean_q}%")
                )
            )
        )
        .order_by(User.created_at.desc())
        .limit(6)
    )
    res = await db.execute(stmt)
    patients = res.scalars().all()
    return [
        {
            "id": p.id,
            "full_name": p.full_name,
            "phone": p.phone,
            "email": p.email if not (p.email or "").endswith("@dikcare.local") else None,
            "whatsapp_number": p.whatsapp_number
        }
        for p in patients
    ]


@router.get("/slots/available-by-date")
async def get_available_slots_by_date(
    doctor_id: str = Query(..., description="Target doctor ID"),
    days_ahead: int = Query(14, ge=1, le=30),
    current_user: User = Depends(require_roles(["ASSISTANT", "ADMIN", "DOCTOR"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns available slots for the doctor grouped by date, starting from Today up to days_ahead.
    Each slot includes its exact chronological daily slot number (#1, #2, #3...) of that day.
    """
    await verify_assistant_doctor_access(current_user, doctor_id, db)

    now_pkt = datetime.now(PKT)
    today_start_pkt = datetime(now_pkt.year, now_pkt.month, now_pkt.day, 0, 0, 0, tzinfo=PKT)
    end_date_pkt = today_start_pkt + timedelta(days=days_ahead, hours=23, minutes=59, seconds=59)

    today_start_utc = today_start_pkt.astimezone(timezone.utc)
    end_date_utc = end_date_pkt.astimezone(timezone.utc)

    # Fetch ALL slots for this doctor in this range ordered by start_time ASC
    slots_res = await db.execute(
        select(DoctorSlot)
        .where(
            and_(
                DoctorSlot.doctor_id == doctor_id,
                DoctorSlot.start_time >= today_start_utc,
                DoctorSlot.start_time <= end_date_utc
            )
        )
        .order_by(DoctorSlot.start_time.asc())
    )
    all_slots = slots_res.scalars().all()

    # Group all slots by date string YYYY-MM-DD
    from collections import defaultdict
    day_slots_map = defaultdict(list)
    for s in all_slots:
        d_str = to_pkt(s.start_time).strftime("%Y-%m-%d")
        day_slots_map[d_str].append(s)

    doc = await db.get(Doctor, doctor_id)
    doc_off_days = [d.strip().lower() for d in (doc.off_days or "sunday").split(",") if d.strip()] if doc else ["sunday"]

    days_result = []
    for day_offset in range(days_ahead + 1):
        target_dt = today_start_pkt + timedelta(days=day_offset)
        d_str = target_dt.strftime("%Y-%m-%d")
        day_name = target_dt.strftime("%A").lower()
        is_off_day = day_name in doc_off_days
        
        day_all_slots = day_slots_map.get(d_str, [])
        total_slots = len(day_all_slots)
        
        available_slots_data = []
        for idx, s in enumerate(day_all_slots):
            s_pkt = to_pkt(s.start_time)
            if s.status == "available":
                # For today, skip slots that already passed in time
                if day_offset == 0 and s_pkt < now_pkt:
                    continue
                available_slots_data.append({
                    "id": s.id,
                    "doctor_id": s.doctor_id,
                    "start_time": s.start_time.isoformat(),
                    "end_time": s.end_time.isoformat(),
                    "start_time_fmt": format_pkt_time(s.start_time),
                    "end_time_fmt": format_pkt_time(s.end_time),
                    "daily_slot_number": idx + 1,
                    "status": s.status
                })

        is_today = (day_offset == 0)
        is_tomorrow = (day_offset == 1)
        
        if is_today:
            label = "Today"
        elif is_tomorrow:
            label = "Tomorrow"
        else:
            label = target_dt.strftime("%a, %b %d")

        days_result.append({
            "date": d_str,
            "label": label,
            "date_fmt": format_pkt_date(target_dt),
            "is_today": is_today,
            "is_tomorrow": is_tomorrow,
            "is_off_day": is_off_day,
            "total_slots": total_slots,
            "available_count": len(available_slots_data),
            "slots": available_slots_data
        })

    return days_result


@router.post("/pos/emergency-slot")
async def create_emergency_slot(
    payload: EmergencySlotRequest,
    current_user: User = Depends(require_roles(["ASSISTANT", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """
    Emergency Slot Generator for Assistant POS Desk.
    Generates an emergency consultation slot when all standard slots are booked
    or for urgent walk-in patients needing immediate care.
    """
    await verify_assistant_doctor_access(current_user, payload.doctor_id, db)

    # 1. Verify Doctor
    doc = await db.get(Doctor, payload.doctor_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    # 2. Parse date in PKT
    try:
        parts = [int(p) for p in payload.visit_date.strip().split("-")]
        visit_date_obj = datetime(parts[0], parts[1], parts[2]).date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid visit_date format. Expected YYYY-MM-DD.")

    now_pkt = datetime.now(PKT)
    day_start_pkt = datetime(visit_date_obj.year, visit_date_obj.month, visit_date_obj.day, 0, 0, 0, tzinfo=PKT)
    day_end_pkt = datetime(visit_date_obj.year, visit_date_obj.month, visit_date_obj.day, 23, 59, 59, 999999, tzinfo=PKT)

    day_start_utc = day_start_pkt.astimezone(timezone.utc)
    day_end_utc = day_end_pkt.astimezone(timezone.utc)

    # 3. Fetch existing slots for this doctor on this day
    slots_res = await db.execute(
        select(DoctorSlot)
        .where(
            and_(
                DoctorSlot.doctor_id == payload.doctor_id,
                DoctorSlot.start_time >= day_start_utc,
                DoctorSlot.start_time <= day_end_utc
            )
        )
        .order_by(DoctorSlot.start_time.asc())
    )
    existing_slots = slots_res.scalars().all()
    total_existing = len(existing_slots)

    # 4. Calculate start_time for the emergency slot
    is_today = (visit_date_obj == now_pkt.date())
    duration = payload.duration_minutes if payload.duration_minutes and payload.duration_minutes > 0 else 20

    if payload.time_str and payload.time_str.upper() == "NOW":
        # Immediate emergency slot starting right now (+1 min)
        start_pkt = now_pkt + timedelta(minutes=1)
        start_utc = start_pkt.astimezone(timezone.utc)
    elif payload.time_str:
        # Custom time specified by assistant
        time_clean = payload.time_str.strip()
        match = re.match(r'(\d{1,2}):(\d{2})\s*(AM|PM)?', time_clean, re.I)
        if match:
            h = int(match.group(1))
            m = int(match.group(2))
            ap = match.group(3)
            if ap and ap.upper() == "PM" and h < 12:
                h += 12
            if ap and ap.upper() == "AM" and h == 12:
                h = 0
            start_pkt = datetime(visit_date_obj.year, visit_date_obj.month, visit_date_obj.day, h, m, 0, tzinfo=PKT)
            start_utc = start_pkt.astimezone(timezone.utc)
        else:
            raise HTTPException(status_code=400, detail="Invalid time format. Example: '08:00 PM'")
    else:
        # Automatic calculation:
        # If there are existing slots, place it right after the latest slot of the day
        if existing_slots:
            latest_end_utc = max(s.end_time for s in existing_slots)
            # If for today and latest_end is in the past, start 2 minutes from now
            now_utc = datetime.now(timezone.utc)
            if is_today and latest_end_utc < now_utc:
                start_utc = now_utc + timedelta(minutes=2)
            else:
                start_utc = latest_end_utc
        else:
            # If no slots exist for this day (e.g. off day or unconfigured day), use doctor's shift start
            evening_start_mins = 1020  # 5:00 PM
            if doc.evening_start:
                m_match = re.match(r'(\d{1,2}):(\d{2})', doc.evening_start)
                if m_match:
                    evening_start_mins = int(m_match.group(1)) * 60 + int(m_match.group(2))
            h = evening_start_mins // 60
            m = evening_start_mins % 60
            start_pkt = datetime(visit_date_obj.year, visit_date_obj.month, visit_date_obj.day, h, m, 0, tzinfo=PKT)
            start_utc = start_pkt.astimezone(timezone.utc)

    # 5. Prevent unique constraint collision on (doctor_id, start_time)
    existing_starts = {s.start_time for s in existing_slots}
    while start_utc in existing_starts:
        start_utc += timedelta(minutes=1)

    end_utc = start_utc + timedelta(minutes=duration)

    # 6. Create the emergency slot in DB
    emergency_slot = DoctorSlot(
        doctor_id=payload.doctor_id,
        start_time=start_utc,
        end_time=end_utc,
        status="available"
    )
    db.add(emergency_slot)
    await db.commit()
    await db.refresh(emergency_slot)

    # 7. Audit log
    await audit_service.log_action(
        db=db,
        actor_id=current_user.id,
        action="CREATE_EMERGENCY_SLOT",
        entity="DoctorSlot",
        entity_id=emergency_slot.id,
        after_value=json.dumps({
            "doctor_id": payload.doctor_id,
            "visit_date": payload.visit_date,
            "start_time": emergency_slot.start_time.isoformat(),
            "daily_slot_number": total_existing + 1
        })
    )

    slot_pkt_start = to_pkt(emergency_slot.start_time)
    slot_pkt_end = to_pkt(emergency_slot.end_time)

    return {
        "success": True,
        "message": f"Emergency slot #{total_existing + 1} generated successfully.",
        "slot": {
            "id": emergency_slot.id,
            "doctor_id": emergency_slot.doctor_id,
            "start_time": emergency_slot.start_time.isoformat(),
            "end_time": emergency_slot.end_time.isoformat(),
            "start_time_fmt": format_pkt_time(slot_pkt_start),
            "end_time_fmt": format_pkt_time(slot_pkt_end),
            "daily_slot_number": total_existing + 1,
            "status": "available",
            "is_emergency": True
        }
    }


@router.post("/pos/book")
async def pos_book_appointment(
    payload: POSBookingRequest,
    current_user: User = Depends(require_roles(["ASSISTANT", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """
    POS / Walk-In Desk direct booking by Assistant.
    - Directly books the selected slot (today or future date).
    - Automatically sets status = CONFIRMED (bypassing public OTP).
    - Queue / Token number aligns directly with the daily slot number of that day (#1, #2, #3...).
    - Handles payment (PENDING_CASH to collect upon calling, or PAID immediately).
    """
    await verify_assistant_doctor_access(current_user, payload.doctor_id, db)

    # 1. Fetch Doctor
    doc_res = await db.execute(
        select(Doctor).options(selectinload(Doctor.user)).where(Doctor.id == payload.doctor_id)
    )
    doc = doc_res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    # 2. Fetch and validate Slot
    slot_res = await db.execute(select(DoctorSlot).where(DoctorSlot.id == payload.slot_id))
    slot = slot_res.scalar_one_or_none()
    if not slot or slot.doctor_id != payload.doctor_id:
        raise HTTPException(status_code=404, detail="The selected consultation slot was not found.")

    if slot.status != "available":
        raise HTTPException(
            status_code=400,
            detail="The selected time slot has already been booked or is locked. Please select another slot."
        )

    # 3. Locate or create Patient User record
    clean_phone = payload.patient_phone.strip()
    clean_email = str(payload.patient_email).strip().lower() if payload.patient_email else ""

    patient = None
    if clean_phone:
        p_res = await db.execute(select(User).where(User.phone == clean_phone))
        patient = p_res.scalar_one_or_none()

    if not patient and clean_email:
        p_res = await db.execute(select(User).where(User.email == clean_email))
        patient = p_res.scalar_one_or_none()

    if not patient:
        patient = User(
            full_name=payload.patient_name.strip(),
            phone=clean_phone,
            email=clean_email if clean_email else f"patient_{clean_phone.replace('+', '')}@dikcare.local",
            role="PATIENT",
            status="active"
        )
        db.add(patient)
        await db.flush()
    else:
        if clean_email and (not patient.email or patient.email.endswith("@dikcare.local")):
            patient.email = clean_email

    # 4. Mark slot as booked
    slot.status = "booked"

    # 5. Generate Slip & Token matching the daily slot sequence
    visit_date = slot.start_time
    slip_num = await slip_service.generate_slip_number(
        db=db,
        doctor_id=doc.id,
        visit_date=visit_date,
        specialty=doc.specialty,
        slot_id=slot.id
    )

    # 6. Create Appointment (Status automatically CONFIRMED)
    appt = Appointment(
        patient_id=patient.id,
        doctor_id=doc.id,
        slot_id=slot.id,
        assistant_id=current_user.id,
        status="CONFIRMED",
        slip_number=slip_num,
        patient_name=payload.patient_name.strip(),
        patient_phone=clean_phone,
        patient_email=clean_email if clean_email else None,
        notes=payload.notes.strip() if payload.notes else "Walk-in appointment registered at clinic desk"
    )
    db.add(appt)
    await db.flush()

    # 7. Create Payment record
    fee = Decimal(str(payload.fee_amount)) if payload.fee_amount is not None else doc.fee_clinic
    p_status = "PAID" if payload.payment_status == "PAID" else "PENDING_CASH"
    now_utc = datetime.now(timezone.utc)
    
    payment = Payment(
        appointment_id=appt.id,
        amount=fee,
        status=p_status,
        paid_at=now_utc if p_status == "PAID" else None,
        collected_by=current_user.id if p_status == "PAID" else None
    )
    db.add(payment)

    # 8. Audit log
    await audit_service.log_action(
        db=db,
        actor_id=current_user.id,
        action="POS_WALK_IN_APPOINTMENT",
        entity="Appointment",
        entity_id=appt.id,
        before_value=None,
        after_value=f"CONFIRMED Slip: {slip_num} (Slot: {format_pkt_date(slot.start_time)} {format_pkt_time(slot.start_time)}, Payment: {p_status})"
    )

    await db.commit()

    token_num = parse_token_from_slip_str(slip_num)

    try:
        from app.services.notification_service import notification_service
        await notification_service.notify_appointment_confirmed(db, appt)
    except Exception:
        pass

    return {
        "status": "SUCCESS",
        "message": f"Appointment booked and confirmed successfully! Token #{token_num}",
        "appointment_id": appt.id,
        "slip_number": slip_num,
        "token_number": token_num,
        "patient_name": appt.patient_name,
        "patient_phone": appt.patient_phone,
        "doctor_name": doc.user.full_name if doc.user else "Doctor",
        "doctor_specialty": doc.specialty,
        "clinic_address": doc.clinic_address,
        "slot_date": format_pkt_date(slot.start_time),
        "slot_time": format_pkt_time(slot.start_time),
        "fee_amount": float(payment.amount),
        "payment_status": payment.status,
        "appointment_status": "CONFIRMED"
    }

