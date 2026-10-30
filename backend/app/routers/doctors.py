"""
Patient directory and doctor discovery endpoints:
- Public doctor search by specialty, D.I. Khan sub-region, and clinic shift
- Spotlighted doctors pinned to top
- Real-time slot availability check with active Redis concurrency locks
"""

import json
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.redis import redis_manager
from app.models import Doctor, DoctorSlot, User, Appointment, DoctorReview, utc_now
from app.schemas import (
    DoctorResponse, SlotResponse,
    ReviewCreateRequest, ReviewResponse, DoctorReviewsSummaryResponse,
    PatientEligibilityCheckResponse, PatientCompletedAppointmentItem
)
from app.core.timezone import to_pkt, format_pkt_date, format_pkt_time
from app.core.cloudinary_service import optimize_cloudinary_url

router = APIRouter(prefix="/doctors", tags=["Doctor Directory"])

def resolve_doctor_image(name: str, spec: str) -> str:
    n = (name or "").lower()
    s = (spec or "").lower()
    if "sadia" in n or "gynecol" in s or "obstetric" in s:
        return "/doctors/dr_sadia_rehman.jpg"
    if "tariq" in n or "babar" in n:
        return "/doctors/dr_tariq_babar.jpg"
    if "sahil" in n or "dermatol" in s:
        return "/doctors/dr_sahil_mehsood.jpg"
    if "haris" in n:
        return "/doctors/dr_haris_rehman.jpg"
    if "asif" in n or "gandapur" in n:
        return "/doctors/dr_asif_gandapur.jpg"
    if "moiz" in n:
        return "/doctors/dr_moiz_ahmad.jpg"
    if "subhan" in n:
        return "/doctors/dr_subhan_sultan.jpg"
    if "cardio" in s:
        return "/doctors/dr_tariq_babar.jpg"
    if "pediat" in s or "child" in s:
        return "/doctors/dr_asif_gandapur.jpg"
    return "/dr_ayesha_khan.jpg"

@router.get("", response_model=List[DoctorResponse])
async def list_doctors(
    sub_region: Optional[str] = Query(None, description="D.I. Khan sub-region (e.g. Circular Road, University Road, Topanwala)"),
    specialty: Optional[str] = Query(None, description="Doctor specialty (e.g. Cardiologist, Gynecologist)"),
    shift: Optional[str] = Query(None, description="Shift (MORNING, EVENING, BOTH)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns public doctor directory sorted by Spotlight (pinned first) then name.
    Accelerated with Redis in-memory cache.
    """
    cache_key = f"doctors:{sub_region or 'all'}:{specialty or 'all'}:{shift or 'all'}"
    cached_data = await redis_manager.get_cache(cache_key)
    if cached_data:
        try:
            return json.loads(cached_data)
        except Exception:
            pass

    query = select(Doctor).options(selectinload(Doctor.user)).where(Doctor.verification_status == "verified")

    if sub_region:
        query = query.where(Doctor.sub_region.ilike(f"%{sub_region}%"))
    if specialty:
        query = query.where(Doctor.specialty.ilike(f"%{specialty}%"))
    if shift:
        query = query.where(Doctor.shift.in_([shift, "BOTH"]))

    # Sort spotlighted doctors first, then by creation date
    query = query.order_by(Doctor.is_spotlight.desc(), Doctor.created_at.desc())

    result = await db.execute(query)
    doctors = result.scalars().all()

    doctor_ids = [doc.id for doc in doctors]
    slots_by_doctor = {doc_id: [] for doc_id in doctor_ids}

    if doctor_ids:
        now = utc_now()
        # Booking buffer: 45 minutes from now in UTC
        min_start_time = now + timedelta(minutes=45)
        # Check slots up to next 14 days
        max_end_time = now + timedelta(days=14)

        slots_query = select(
            DoctorSlot.doctor_id,
            DoctorSlot.start_time
        ).where(
            and_(
                DoctorSlot.doctor_id.in_(doctor_ids),
                DoctorSlot.status == "available",
                DoctorSlot.start_time >= min_start_time,
                DoctorSlot.start_time <= max_end_time
            )
        ).order_by(DoctorSlot.doctor_id, DoctorSlot.start_time.asc())

        slots_result = await db.execute(slots_query)
        for s_doc_id, s_start in slots_result.all():
            slots_by_doctor[s_doc_id].append(s_start)

    now_pkt = to_pkt(utc_now())
    today_pkt_date = now_pkt.date()
    tomorrow_pkt_date = today_pkt_date + timedelta(days=1)
    today_day_name = now_pkt.strftime("%A").lower()

    doctor_list = []
    for doc in doctors:
        doc_name = doc.user.full_name if doc.user else "Dr. Healthcare Specialist"
        doc_slots = slots_by_doctor.get(doc.id, [])
        doc_off_days = [d.strip().lower() for d in (doc.off_days or "sunday").split(",") if d.strip()]
        is_today_off = today_day_name in doc_off_days

        # Exclude slots that fall on doctor's designated off days
        valid_slots = []
        for s_dt in doc_slots:
            slot_pkt_dt = to_pkt(s_dt)
            if slot_pkt_dt.strftime("%A").lower() in doc_off_days:
                continue
            valid_slots.append(slot_pkt_dt)

        upcoming_count = len(valid_slots)
        today_slots = [s for s in valid_slots if s.date() == today_pkt_date]
        is_available_today = len(today_slots) > 0

        next_available_slot = None
        if is_today_off:
            today_status = "OFF_TODAY"
        elif is_available_today:
            today_status = "AVAILABLE_TODAY"
        elif upcoming_count > 0:
            today_status = "NO_SLOTS_TODAY"
        else:
            today_status = "NO_UPCOMING_SLOTS"

        if valid_slots:
            earliest = valid_slots[0]
            earliest_date = earliest.date()
            time_fmt = format_pkt_time(earliest)
            if earliest_date == today_pkt_date:
                next_available_slot = f"Today · {time_fmt}"
            elif earliest_date == tomorrow_pkt_date:
                next_available_slot = f"Tomorrow · {time_fmt}"
            else:
                day_fmt = earliest.strftime("%a, %b %d")
                next_available_slot = f"{day_fmt} · {time_fmt}"

        doctor_list.append({
            "id": doc.id,
            "user_id": doc.user_id,
            "full_name": doc_name,
            "email": doc.user.email if doc.user else None,
            "phone": doc.user.phone if doc.user else None,
            "specialty": doc.specialty,
            "sub_region": doc.sub_region,
            "clinic_address": doc.clinic_address,
            "google_maps_url": doc.google_maps_url,
            "fee_clinic": float(doc.fee_clinic),
            "shift": doc.shift,
            "morning_start": doc.morning_start or "09:00",
            "morning_end": doc.morning_end or "13:00",
            "evening_start": doc.evening_start or "17:00",
            "evening_end": doc.evening_end or "21:00",
            "is_spotlight": doc.is_spotlight,
            "verification_status": doc.verification_status,
            "profile_image": optimize_cloudinary_url(doc.profile_image, 600) if doc.profile_image else resolve_doctor_image(doc_name, doc.specialty),
            "off_days": doc.off_days or "sunday",
            "bio": doc.bio,
            "expertise": doc.expertise,
            "experience_years": doc.experience_years if doc.experience_years is not None else 5,
            "qualification": doc.qualification or "MBBS, FCPS",
            "created_at": doc.created_at.isoformat(),
            "next_available_slot": next_available_slot,
            "is_available_today": is_available_today,
            "today_status": today_status,
            "upcoming_slots_count": upcoming_count
        })

    # Cache in Redis for 60 seconds (rapid real-time freshness)
    await redis_manager.set_cache(cache_key, json.dumps(doctor_list), ttl=60)
    return doctor_list

@router.get("/{doctor_id}/slots", response_model=List[SlotResponse])
async def get_doctor_slots(doctor_id: str, db: AsyncSession = Depends(get_db)):
    """
    Fetches upcoming available slots for a doctor, actively checking Redis distributed locks.
    Excludes any slots whose scheduled start time has already passed.
    Accelerated with Redis in-memory TTL caching (Checked FIRST before DB roundtrip).
    """
    now = utc_now()
    min_start_time = now + timedelta(minutes=45)
    cache_key = f"doctor_slots:{doctor_id}"

    # 1. Fast path: Check Redis cache first to bypass cold Neon PostgreSQL SSL handshake (~5-6s saved!)
    cached_payload = await redis_manager.get_cache(cache_key)
    if cached_payload:
        try:
            cached_obj = json.loads(cached_payload)
            # Support both new payload format {"off_days": [...], "slots": [...]} and legacy list format
            if isinstance(cached_obj, dict) and "slots" in cached_obj:
                doc_off_days = cached_obj.get("off_days", ["sunday"])
                slots_data = cached_obj.get("slots", [])
            else:
                doc_off_days = ["sunday"]
                slots_data = cached_obj if isinstance(cached_obj, list) else []

            candidate_slots = []
            for s in slots_data:
                try:
                    s_dt = datetime.fromisoformat(s["start_time"].replace("Z", "+00:00"))
                    if s_dt < min_start_time:
                        continue
                    if to_pkt(s_dt).strftime("%A").lower() in doc_off_days:
                        continue
                    candidate_slots.append(s)
                except Exception:
                    pass

            # Single-roundtrip batch lock check (MGET) for active locks
            candidate_ids = [s["id"] for s in candidate_slots]
            locked_ids = await redis_manager.get_active_slot_locks(candidate_ids)
            return [s for s in candidate_slots if s["id"] not in locked_ids]
        except Exception:
            pass

    # 2. Cache miss: Query doctor profile and database slots
    doc = await db.get(Doctor, doctor_id)
    doc_off_days = [d.strip().lower() for d in (doc.off_days or "sunday").split(",") if d.strip()] if doc else ["sunday"]

    query = select(DoctorSlot).where(
        and_(
            DoctorSlot.doctor_id == doctor_id,
            DoctorSlot.status == "available",
            DoctorSlot.start_time >= min_start_time
        )
    ).order_by(DoctorSlot.start_time.asc())

    result = await db.execute(query)
    slots = result.scalars().all()

    def to_utc_iso(dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        return dt.isoformat()

    slots_to_cache = []
    for s in slots:
        # Strictly skip any slot falling on doctor's designated off days
        pkt_time = to_pkt(s.start_time)
        if pkt_time.strftime("%A").lower() in doc_off_days:
            continue
        slots_to_cache.append({
            "id": s.id,
            "doctor_id": s.doctor_id,
            "start_time": to_utc_iso(s.start_time),
            "end_time": to_utc_iso(s.end_time),
            "slot_date": pkt_time.strftime("%Y-%m-%d"),
            "slot_date_fmt": format_pkt_date(s.start_time),
            "start_time_fmt": format_pkt_time(s.start_time),
            "end_time_fmt": format_pkt_time(s.end_time),
            "status": s.status
        })

    # Store off_days metadata alongside slots in Redis cache for 300 seconds (5 minutes)
    cache_data = {
        "off_days": doc_off_days,
        "slots": slots_to_cache
    }
    await redis_manager.set_cache(cache_key, json.dumps(cache_data), ttl=300)

    # Single-roundtrip batch lock check (MGET) instead of sequential loop
    all_slot_ids = [s["id"] for s in slots_to_cache]
    locked_ids = await redis_manager.get_active_slot_locks(all_slot_ids)
    return [s for s in slots_to_cache if s["id"] not in locked_ids]


# ── DOCTOR VERIFIED REVIEWS ──────────────────────────────────────────

@router.get("/{doctor_id}/reviews", response_model=DoctorReviewsSummaryResponse)
async def get_doctor_reviews(
    doctor_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns public verified patient reviews and overall rating summary for a doctor.
    """
    query = (
        select(DoctorReview)
        .where(DoctorReview.doctor_id == doctor_id)
        .order_by(DoctorReview.created_at.desc())
    )
    result = await db.execute(query)
    reviews = result.scalars().all()

    total = len(reviews)
    if total > 0:
        avg_rating = round(sum(r.rating for r in reviews) / total, 1)
    else:
        avg_rating = 5.0  # Baseline rating for newly active doctors

    breakdown = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
    for r in reviews:
        star = int(r.rating)
        if star in breakdown:
            breakdown[star] += 1

    masked_reviews = []
    for r in reviews:
        phone_masked = r.patient_phone
        if phone_masked and len(phone_masked) >= 7:
            digits = re.sub(r"[^\d]", "", phone_masked)
            phone_masked = f"+92 {digits[1:4] if len(digits)>4 else '300'} ••• {digits[-3:] if len(digits)>=3 else '000'}"
        masked_reviews.append(
            ReviewResponse(
                id=r.id,
                doctor_id=r.doctor_id,
                appointment_id=r.appointment_id,
                patient_name=r.patient_name,
                patient_phone=phone_masked or "Verified Patient",
                rating=r.rating,
                comment=r.comment,
                tags=r.tags,
                is_verified=r.is_verified,
                created_at=r.created_at
            )
        )

    return DoctorReviewsSummaryResponse(
        doctor_id=doctor_id,
        average_rating=avg_rating,
        total_reviews=total,
        rating_breakdown=breakdown,
        reviews=masked_reviews
    )


@router.get("/{doctor_id}/check-eligibility", response_model=PatientEligibilityCheckResponse)
async def check_patient_review_eligibility(
    doctor_id: str,
    identifier: str = Query(..., description="Patient mobile number or digital slip #"),
    db: AsyncSession = Depends(get_db)
):
    """
    Checks if a patient has completed appointments for this doctor.
    Returns:
    - If they have COMPLETED visits: list of all completed appointments so they can pick which visit to review.
    - If they only have other bookings (CONFIRMED, PENDING, etc.): informative prompt that only COMPLETED appointments can mark a review.
    """
    identifier = identifier.strip()
    clean_slip = identifier.lstrip('#').strip().upper()
    digits_only = re.sub(r"[^\d]", "", identifier)
    phone_clean = re.sub(r"[^\d+]", "", identifier)

    conditions = [
        func.upper(Appointment.slip_number) == clean_slip,
        Appointment.patient_phone == identifier,
        Appointment.patient_phone == phone_clean,
    ]
    if len(digits_only) >= 4:
        match_segment = digits_only[-7:] if len(digits_only) >= 7 else digits_only
        conditions.extend([
            Appointment.patient_phone.ilike(f"%{match_segment}%"),
            Appointment.patient.has(User.phone.ilike(f"%{match_segment}%"))
        ])

    query = (
        select(Appointment)
        .options(selectinload(Appointment.patient), selectinload(Appointment.slot))
        .where(
            and_(
                Appointment.doctor_id == doctor_id,
                or_(*conditions)
            )
        )
        .order_by(Appointment.created_at.desc())
    )
    result = await db.execute(query)
    appts = result.scalars().all()

    if not appts:
        return PatientEligibilityCheckResponse(
            can_review=False,
            message="No appointment bookings found with this doctor for this mobile number or slip #.",
            completed_appointments=[],
            other_appointments_count=0,
            other_statuses=[]
        )

    completed_appts = [a for a in appts if (a.status or "").upper() == "COMPLETED"]
    other_appts = [a for a in appts if (a.status or "").upper() != "COMPLETED"]
    other_statuses = list(dict.fromkeys([(a.status or "PENDING").replace("_", " ").title() for a in other_appts]))

    if not completed_appts:
        status_name = other_statuses[0] if other_statuses else "Confirmed"
        return PatientEligibilityCheckResponse(
            can_review=False,
            message=f"Only patients who have a COMPLETED appointment can mark a review. Your current booking status is '{status_name}'. Please wait until your consultation is completed by the clinic.",
            completed_appointments=[],
            other_appointments_count=len(other_appts),
            other_statuses=other_statuses
        )

    # Patient has completed appointment(s)
    completed_items: List[PatientCompletedAppointmentItem] = []
    for ca in completed_appts:
        rev_q = select(DoctorReview).where(DoctorReview.appointment_id == ca.id)
        rev_res = await db.execute(rev_q)
        existing_rev = rev_res.scalar_one_or_none()

        date_str = None
        time_str = None
        if ca.slot and ca.slot.start_time:
            d = ca.slot.start_time
            date_str = format_pkt_date(d)
            time_str = format_pkt_time(d)
        elif ca.created_at:
            d = ca.created_at
            date_str = format_pkt_date(d)
            time_str = format_pkt_time(d)

        completed_items.append(
            PatientCompletedAppointmentItem(
                id=ca.id,
                slip_number=ca.slip_number,
                patient_name=ca.patient_name or (ca.patient.full_name if ca.patient else "Patient"),
                patient_phone=ca.patient_phone or (ca.patient.phone if ca.patient else None),
                status=ca.status,
                slot_date=date_str,
                slot_time=time_str,
                already_reviewed=existing_rev is not None,
                existing_rating=existing_rev.rating if existing_rev else None,
                existing_comment=existing_rev.comment if existing_rev else None
            )
        )

    return PatientEligibilityCheckResponse(
        can_review=True,
        message=f"Found {len(completed_items)} completed appointment(s). Select the visit you want to review.",
        completed_appointments=completed_items,
        other_appointments_count=len(other_appts),
        other_statuses=other_statuses
    )


@router.post("/{doctor_id}/reviews", response_model=ReviewResponse)
async def submit_doctor_review(
    doctor_id: str,
    payload: ReviewCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a verified review for a doctor.
    STRICT RULE: The patient MUST have a COMPLETED consultation appointment with this doctor.
    If appointment_id is specified, the review is attached to that specific visit.
    """
    doc_res = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doctor = doc_res.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    identifier = payload.identifier.strip()
    clean_slip = identifier.lstrip('#').strip().upper()
    digits_only = re.sub(r"[^\d]", "", identifier)

    phone_clean = re.sub(r"[^\d+]", "", identifier)
    conditions = [
        func.upper(Appointment.slip_number) == clean_slip,
        Appointment.patient_phone == identifier,
        Appointment.patient_phone == phone_clean,
    ]
    if len(digits_only) >= 4:
        match_segment = digits_only[-7:] if len(digits_only) >= 7 else digits_only
        conditions.extend([
            Appointment.patient_phone.ilike(f"%{match_segment}%"),
            Appointment.patient.has(User.phone.ilike(f"%{match_segment}%"))
        ])

    # Search appointments for this doctor matching either slip_number or phone
    query = (
        select(Appointment)
        .options(selectinload(Appointment.patient))
        .where(
            and_(
                Appointment.doctor_id == doctor_id,
                or_(*conditions)
            )
        )
        .order_by(Appointment.created_at.desc())
    )

    result = await db.execute(query)
    matched_appts = result.scalars().all()

    # If appointment_id is explicitly selected
    if payload.appointment_id:
        target_appt = next((a for a in matched_appts if a.id == payload.appointment_id), None)
        if not target_appt:
            appt_lookup = await db.execute(
                select(Appointment).options(selectinload(Appointment.patient)).where(Appointment.id == payload.appointment_id)
            )
            target_appt = appt_lookup.scalar_one_or_none()

        if not target_appt or target_appt.doctor_id != doctor_id:
            raise HTTPException(status_code=404, detail="Selected appointment was not found for this doctor.")

        if (target_appt.status or "").upper() != "COMPLETED":
            status_label = (target_appt.status or "PENDING").replace("_", " ").title()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Only patients who have a COMPLETED appointment can mark a review. Selected booking status is '{status_label}'. Please wait until your visit is completed by the clinic."
            )
        completed_appt = target_appt
    else:
        if not matched_appts:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No appointment record found for this doctor matching that Phone Number or Digital Slip #. Please verify your details."
            )

        # Check for completed appointment
        completed_appt = next((a for a in matched_appts if (a.status or "").upper() == "COMPLETED"), None)
        if not completed_appt:
            latest_appt = matched_appts[0]
            status_label = (latest_appt.status or "PENDING").replace("_", " ").title()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Only patients who have a COMPLETED appointment can mark a review. Your booking status is currently '{status_label}'. Please wait until your visit is completed by the clinic."
            )

    # Check if a review already exists for this completed appointment
    existing_rev_query = select(DoctorReview).where(DoctorReview.appointment_id == completed_appt.id)
    rev_res = await db.execute(existing_rev_query)
    existing_rev = rev_res.scalar_one_or_none()

    patient_display_name = completed_appt.patient_name or (completed_appt.patient.full_name if completed_appt.patient else "Verified Patient")
    patient_phone_raw = completed_appt.patient_phone or (completed_appt.patient.phone if completed_appt.patient else identifier)

    if existing_rev:
        # Update existing review
        existing_rev.rating = payload.rating
        existing_rev.comment = payload.comment
        existing_rev.tags = payload.tags
        existing_rev.patient_name = patient_display_name
        existing_rev.created_at = utc_now()
        await db.commit()
        await db.refresh(existing_rev)
        return existing_rev

    # Create new verified review
    new_review = DoctorReview(
        doctor_id=doctor_id,
        appointment_id=completed_appt.id,
        patient_name=patient_display_name,
        patient_phone=patient_phone_raw,
        rating=payload.rating,
        comment=payload.comment,
        tags=payload.tags,
        is_verified=True
    )
    db.add(new_review)
    await db.commit()
    await db.refresh(new_review)
    return new_review


