"""
Booking workflow and verification router:
1. Patient submits booking request -> Acquires 10-minute Redis lock on slot & sends 6-digit OTP
2. Patient verifies 6-digit code -> Transition to PENDING_ASSISTANT_APPROVAL & real-time dispatch
3. Passwordless Track My Appointment portal -> Lookup by phone + slip number
"""

from typing import Optional
import uuid
import re
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.redis import redis_manager
from app.core.security import create_access_token
from app.services.otp_service import otp_service
from app.models import User, Doctor, DoctorSlot, Appointment, Payment, utc_now
from app.schemas import (
    BookingRequestSchema, OTPVerifySchema, 
    TrackAppointmentRequest, AppointmentResponse,
    MultiAppointmentTrackResponse
)
from app.core.timezone import format_pkt_date, format_pkt_time

router = APIRouter(prefix="/booking", tags=["Booking & Verification"])

@router.post("/request")
async def initiate_booking(payload: BookingRequestSchema, db: AsyncSession = Depends(get_db)):
    """
    Step 1: Patient selects doctor and slot.
    - Locks slot in Redis memory for 10 minutes (`SET slot:lock:{id} NX EX 600`).
    - Generates and dispatches 6-digit verification code.
    - Creates or locates patient record.
    """
    # 1. Verify slot exists and is available in DB (or dynamically provision slot for doctor)
    slot_res = await db.execute(select(DoctorSlot).where(DoctorSlot.id == payload.slot_id))
    slot = slot_res.scalar_one_or_none()

    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The selected consultation time slot does not exist or was removed by the doctor. Please select another slot."
        )

    slot_start = slot.start_time
    if slot_start and slot_start.tzinfo is None:
        slot_start = slot_start.replace(tzinfo=timezone.utc)
    now_dt = utc_now()
    if now_dt.tzinfo is None:
        now_dt = now_dt.replace(tzinfo=timezone.utc)

    min_booking_time = now_dt + timedelta(minutes=45)
    if slot_start and slot_start < min_booking_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consultation appointments must be booked at least 45 minutes in advance of the scheduled slot time."
        )

    if slot.status != "available":
        # Check if held slot has expired
        active_lock = await redis_manager.get_slot_lock(slot.id)
        if not active_lock and slot.status == "hold":
            slot.status = "available"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The selected time slot is currently locked. Please select another slot."
            )

    # 2. Find or register patient user record (passwordless)
    patient = None
    clean_phone = payload.phone.strip() if payload.phone else ""
    clean_email = payload.email.strip().lower() if payload.email else ""

    if clean_phone:
        user_res = await db.execute(select(User).where(User.phone == clean_phone))
        patient = user_res.scalar_one_or_none()

    if not patient and clean_email:
        user_res = await db.execute(select(User).where(User.email == clean_email))
        patient = user_res.scalar_one_or_none()

    if not patient:
        patient = User(
            full_name=payload.full_name.strip(),
            email=clean_email if clean_email else f"patient_{clean_phone.replace('+', '')}@dikcare.local",
            phone=clean_phone,
            whatsapp_number=payload.whatsapp_number.strip() if payload.whatsapp_number else clean_phone,
            role="PATIENT",
            status="active"
        )
        db.add(patient)
        await db.flush()
    else:
        # Existing patient user record found:
        # DO NOT overwrite user full_name! The individual visit patient name is stored on the appointment itself.
        if clean_email and (not patient.email or patient.email.endswith("@dikcare.local") or patient.email != clean_email):
            existing_user_with_email = await db.scalar(
                select(User.id).where(User.email == clean_email, User.id != patient.id)
            )
            if not existing_user_with_email:
                patient.email = clean_email
        if not patient.full_name and payload.full_name:
            patient.full_name = payload.full_name.strip()
        if payload.whatsapp_number and not patient.whatsapp_number:
            patient.whatsapp_number = payload.whatsapp_number.strip()
        await db.flush()

    # Cache specific patient visit name, contact, and email under this slot lock
    patient_visit_name = payload.full_name.strip()
    patient_visit_phone = payload.phone.strip()
    await redis_manager.set(f"slot:patient_name:{slot.id}", patient_visit_name, expire=600)
    await redis_manager.set(f"slot:patient_phone:{slot.id}", patient_visit_phone, expire=600)
    if clean_email:
        await redis_manager.set(f"slot:patient_email:{slot.id}", clean_email, expire=600)

    # 3. Acquire 10-minute atomic Redis slot lock
    locked = await redis_manager.acquire_slot_lock(slot.id, patient.id, ttl_seconds=600)
    if not locked:
        existing_pid = await redis_manager.get(f"slot:lock:{slot.id}")
        if existing_pid != patient.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another patient is currently verifying this time slot. Please choose another slot or try again in a few minutes."
            )

    # 4. Issue 6-digit OTP (rate limited)
    success, msg, dev_code = await otp_service.issue_verification_code(payload.phone)
    if not success:
        # Release lock on failure
        await redis_manager.release_slot_lock(slot.id)
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=msg)

    await db.commit()

    return {
        "status": "OTP_SENT",
        "message": msg,
        "contact": payload.phone,
        "slot_id": slot.id,
        "patient_id": patient.id,
        "dev_code": dev_code, # Rendered in floating UI banner/toast in dev mode
        "lock_ttl_seconds": 600
    }

@router.post("/verify")
async def verify_booking_otp(payload: OTPVerifySchema, db: AsyncSession = Depends(get_db)):
    """
    Step 2: Patient enters 6-digit code.
    - Verifies OTP against Redis hash.
    - Creates Appointment with status PENDING_ASSISTANT_APPROVAL.
    - Creates linked Payment record with status PENDING_CASH.
    - Transitions DB slot status to 'hold'.
    - Returns signed patient access token.
    """
    # 1. Verify code
    is_valid, msg = await otp_service.verify_code(payload.contact, payload.code)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    # 2. Get slot and doctor info
    slot_res = await db.execute(
        select(DoctorSlot).options(selectinload(DoctorSlot.doctor)).where(DoctorSlot.id == payload.slot_id)
    )
    slot = slot_res.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot record not found.")

    # 3. Locate patient
    contact = payload.contact.strip()
    user_res = await db.execute(
        select(User).where(
            or_(
                User.phone == contact,
                User.whatsapp_number == contact,
                User.email == contact
            )
        )
    )
    patient = user_res.scalar_one_or_none()
    if not patient:
        cached_pid = await redis_manager.get(f"slot:lock:{payload.slot_id}")
        if cached_pid:
            pid_res = await db.execute(select(User).where(User.id == cached_pid))
            patient = pid_res.scalar_one_or_none()

    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found.")

    # 4. Resolve the patient's visit name, phone, and email
    patient_visit_name = payload.patient_name
    if not patient_visit_name:
        cached_name = await redis_manager.get(f"slot:patient_name:{payload.slot_id}")
        if cached_name:
            patient_visit_name = cached_name.decode("utf-8") if isinstance(cached_name, bytes) else str(cached_name)
    if not patient_visit_name:
        patient_visit_name = patient.full_name if patient else "Patient"

    patient_visit_phone = payload.patient_phone or payload.contact or (patient.phone if patient else "N/A")

    candidate_email = (payload.patient_email or "").strip().lower()
    if not candidate_email:
        cached_email = await redis_manager.get(f"slot:patient_email:{payload.slot_id}")
        if cached_email:
            candidate_email = cached_email.decode("utf-8") if isinstance(cached_email, bytes) else str(cached_email)
    if not candidate_email and patient and patient.email and not patient.email.endswith("@dikcare.local"):
        candidate_email = patient.email

    if candidate_email and (not patient.email or patient.email.endswith("@dikcare.local") or patient.email != candidate_email):
        existing_user_with_email = await db.scalar(
            select(User.id).where(User.email == candidate_email, User.id != patient.id)
        )
        if not existing_user_with_email:
            patient.email = candidate_email
            await db.flush()

    # 5. Create Appointment record with sequential slip number scoped per doctor and per visit date
    from app.services.slip_service import slip_service
    visit_date = slot.start_time if slot and slot.start_time else datetime.now(timezone.utc)
    slip_num = await slip_service.generate_slip_number(
        db=db,
        doctor_id=slot.doctor_id,
        visit_date=visit_date,
        specialty=slot.doctor.specialty if slot and slot.doctor else "General"
    )
    
    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=slot.doctor_id,
        slot_id=slot.id,
        status="PENDING_ASSISTANT_APPROVAL",
        slip_number=slip_num,
        patient_name=patient_visit_name,
        patient_phone=patient_visit_phone,
        patient_email=candidate_email if candidate_email else None,
        notes=f"Patient: {patient_visit_name}. Clinic visit booked via web portal. Pending assistant desk verification."
    )
    db.add(appointment)
    await db.flush()

    # 5. Create Payment record (Cash at clinic)
    payment = Payment(
        appointment_id=appointment.id,
        amount=slot.doctor.fee_clinic if slot.doctor else 1000.00,
        status="PENDING_CASH"
    )
    db.add(payment)

    # 6. Update slot status in DB
    slot.status = "hold"
    
    # 7. Release Redis lock now that DB appointment has taken over & clear cache
    await redis_manager.release_slot_lock(payload.slot_id)
    await redis_manager.clear_cache_pattern(f"doctor_slots:{slot.doctor_id}")
    await db.commit()

    # Trigger Event 1: Notify assistant Gmail of new booking request
    try:
        from app.services.notification_service import notification_service
        # Refresh appointment with slot & doctor for email template
        await db.refresh(appointment, ["doctor", "slot", "patient"])
        await notification_service.notify_appointment_requested(db, appointment)
    except Exception as notify_err:
        import logging
        logging.getLogger("booking").warning(f"Notification dispatch error: {notify_err}")

    # Issue signed patient access token for instant session tracker
    token = create_access_token(data={"sub": patient.id, "role": "PATIENT"})

    return {
        "status": "SUCCESS",
        "appointment_id": appointment.id,
        "appointment_status": appointment.status,
        "slip_number": appointment.slip_number,
        "message": "Appointment request submitted. The clinic assistant is reviewing your request.",
        "patient_token": token
    }

@router.get("/track", response_model=MultiAppointmentTrackResponse)
async def track_appointment_get(phone: str, slip_number: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """GET handler for appointment tracking by phone and optional slip number."""
    return await track_appointment(TrackAppointmentRequest(phone=phone, slip_number=slip_number), db=db)

@router.post("/track", response_model=MultiAppointmentTrackResponse)
async def track_appointment(payload: TrackAppointmentRequest, db: AsyncSession = Depends(get_db)):
    """
    Passwordless lookup: Patients can return anytime and check appointment status
    using their phone number (and optional digital slip number).
    Returns all appointments matching the phone number, with the primary or requested one highlighted.
    """
    raw_phone = (payload.phone or "").strip()
    raw_slip = (payload.slip_number or "").strip()

    if not raw_phone and not raw_slip:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a mobile number or digital slip number to track your appointment."
        )

    # Helper to clean and normalize slip numbers (strip 'SLIP', '#', 'slip', etc.)
    def clean_slip_candidate(val: str) -> str:
        v = val.strip()
        v = re.sub(r'^(slip\s*#?|#)\s*', '', v, flags=re.IGNORECASE).strip()
        return v

    slip_candidates = set()
    for raw in [raw_slip, raw_phone]:
        if raw:
            norm = clean_slip_candidate(raw)
            if norm:
                # If it looks like a slip code or contains letters/dashes or UUID
                if any(c.isalpha() for c in norm) or "-" in norm or norm.upper().startswith("DIK") or len(norm) >= 8:
                    slip_candidates.add(norm)
                    slip_candidates.add(norm.upper())

    # Raw string inputs directly tested for containment
    direct_strings = set()
    for raw in [raw_phone, raw_slip]:
        if raw:
            direct_strings.add(raw)
            clean_s = clean_slip_candidate(raw)
            if clean_s:
                direct_strings.add(clean_s)

    # Phone digits candidates from both phone and slip inputs
    phone_digits = ''.join(c for c in raw_phone if c.isdigit())
    slip_digits = ''.join(c for c in raw_slip if c.isdigit())
    digits_to_test = set()

    for digits in [phone_digits, slip_digits]:
        if digits and len(digits) >= 4:
            digits_to_test.add(digits)
            if digits.startswith("92"):
                digits_to_test.add(digits[2:])
                digits_to_test.add(f"0{digits[2:]}")
            elif digits.startswith("0"):
                digits_to_test.add(digits[1:])
                digits_to_test.add(f"92{digits[1:]}")

    conditions = []

    # 1. Slip / ID matching
    for sc in slip_candidates:
        conditions.append(Appointment.slip_number == sc)
        conditions.append(Appointment.slip_number.ilike(f"%{sc}%"))
        conditions.append(Appointment.id == sc)

    # 2. Direct string matching on patient_phone / User phone
    for ds in direct_strings:
        if len(ds) >= 3:
            conditions.append(Appointment.patient_phone == ds)
            conditions.append(Appointment.patient_phone.ilike(f"%{ds}%"))
            conditions.append(User.phone == ds)
            conditions.append(User.phone.ilike(f"%{ds}%"))
            conditions.append(User.whatsapp_number == ds)
            conditions.append(User.whatsapp_number.ilike(f"%{ds}%"))

    # 3. Cleaned phone digits matching in SQL (handles spaces, dashes, + in DB or user input)
    clean_patient_phone = func.replace(func.replace(func.replace(Appointment.patient_phone, ' ', ''), '-', ''), '+', '')
    clean_user_phone = func.replace(func.replace(func.replace(User.phone, ' ', ''), '-', ''), '+', '')
    clean_user_wa = func.replace(func.replace(func.replace(User.whatsapp_number, ' ', ''), '-', ''), '+', '')

    for d in digits_to_test:
        if len(d) >= 4:
            conditions.append(clean_patient_phone.like(f"%{d}%"))
            conditions.append(clean_user_phone.like(f"%{d}%"))
            conditions.append(clean_user_wa.like(f"%{d}%"))

    query = select(Appointment).outerjoin(User, Appointment.patient_id == User.id)\
        .options(
            selectinload(Appointment.doctor).selectinload(Doctor.user),
            selectinload(Appointment.patient),
            selectinload(Appointment.slot),
            selectinload(Appointment.payment)
        )

    if conditions:
        query = query.where(or_(*conditions))

    query = query.order_by(Appointment.created_at.desc())

    result = await db.execute(query)
    appointments = result.scalars().all()

    if not appointments:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Slip number or mobile number does not match any appointment."
        )

    def parse_token_from_slip(slip_number: Optional[str]) -> Optional[int]:
        if not slip_number:
            return None
        parts = slip_number.strip().split("-")
        # Official confirmed slip: DIK-[SPECIALTY]-[YYYYMMDD]-[SEQ_NUM:03d]-[JITTER] (5 parts)
        if len(parts) >= 5 and parts[3].isdigit():
            try:
                val = int(parts[3])
                if 1 <= val <= 999:
                    return val
            except ValueError:
                pass
        # Fallback for 4-part slips with 2-3 digit sequence (e.g. DIK-CARD-20260930-014)
        if len(parts) == 4 and parts[3].isdigit() and len(parts[3]) <= 3:
            try:
                val = int(parts[3])
                if 1 <= val <= 999:
                    return val
            except ValueError:
                pass
        return None

    def serialize_appointment(appt):
        return {
            "id": appt.id,
            "patient_id": appt.patient_id,
            "doctor_id": appt.doctor_id,
            "slot_id": appt.slot_id,
            "status": appt.status,
            "slip_number": appt.slip_number,
            "token_number": parse_token_from_slip(appt.slip_number),
            "notes": appt.notes,
            "reschedule_reason": appt.reschedule_reason,
            "created_at": appt.created_at,
            "patient_name": appt.patient_name or (appt.patient.full_name if appt.patient else "Patient"),
            "patient_phone": appt.patient_phone or (appt.patient.phone if appt.patient else "N/A"),
            "doctor_name": appt.doctor.user.full_name if appt.doctor and appt.doctor.user else "Specialist Doctor",
            "specialty": appt.doctor.specialty if appt.doctor else "Specialist",
            "clinic_address": appt.doctor.clinic_address if appt.doctor else "D.I. Khan Care Clinic",
            "slot_start": appt.slot.start_time if appt.slot else None,
            "slot_date": format_pkt_date(appt.slot.start_time) if appt.slot and appt.slot.start_time else None,
            "slot_time": format_pkt_time(appt.slot.start_time) if appt.slot and appt.slot.start_time else None,
            "payment_status": appt.payment.status if appt.payment else "PENDING_CASH",
            "fee_amount": appt.payment.amount if appt.payment else 1000.00
        }

    serialized_list = [serialize_appointment(a) for a in appointments]
    primary = serialized_list[0]
    if raw_slip:
        matched_item = None
        for item in serialized_list:
            item_slip = (item.get("slip_number") or "").upper()
            item_id = (item.get("id") or "").upper()
            clean_raw = clean_slip_candidate(raw_slip).upper()
            if clean_raw in item_slip or clean_raw == item_id or any(sc.upper() in item_slip for sc in slip_candidates):
                matched_item = item
                break
        if not matched_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Slip number or mobile number does not match any appointment."
            )
        primary = matched_item
    elif slip_candidates:
        for sc in slip_candidates:
            for item in serialized_list:
                item_slip = (item.get("slip_number") or "").upper()
                if sc.upper() in item_slip or item.get("id") == sc:
                    primary = item
                    break

    return {
        **primary,
        "appointments": serialized_list
    }
