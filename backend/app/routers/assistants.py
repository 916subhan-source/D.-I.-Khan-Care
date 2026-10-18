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
from app.schemas import AppointmentResponse, RescheduleRequest, MarkPaidRequest
from app.core.timezone import format_pkt_date, format_pkt_time, format_pkt_ymd

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
            "evening_end": doc.evening_end or "21:00"
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
        # Hide all past closed consultations before today by default in Pakistan Standard Time (UTC+5)
        now_pkt = datetime.now(timezone(timedelta(hours=5)))
        today_start_pkt = datetime(now_pkt.year, now_pkt.month, now_pkt.day, 0, 0, 0, tzinfo=timezone(timedelta(hours=5)))
        today_start_utc = today_start_pkt.astimezone(timezone.utc)
        closed_statuses = ["COMPLETED", "CANCELLED", "REJECTED", "completed", "cancelled", "rejected"]
        appt_time = func.coalesce(DoctorSlot.start_time, Appointment.created_at)
        query = query.where(
            or_(
                ~Appointment.status.in_(closed_statuses),
                appt_time >= today_start_utc
            )
        )


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
            "fee_amount": float(appt.payment.amount) if appt.payment else float(appt.doctor.fee_clinic if appt.doctor else 1000.00)
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
            specialty=appt.doctor.specialty if appt.doctor else "General"
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
        "fee_amount": appt.payment.amount if appt.payment else 1000.00
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
    current_user: User = Depends(require_roles(["ASSISTANT", "ADMIN"])),
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

